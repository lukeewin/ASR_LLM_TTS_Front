var task = "transcribe";
var language = "zh";
var temperature = "0";
var best_of = "5";
var beam_size = "5";
var vad_filter= "False";
var min_silence_duration_ms = "3000";
var word_timestamps = "False";
var hallucination_silence_threshold = "3";
var tts_language = "EN";
var speaker = "EN-US";
var speed = "1.0";

layui.use(function(){
  var $ = layui.$;
  var form = layui.form;
  var layer = layui.layer;

  // 提交事件
  form.on('submit(asr-tts-parameter-btn)', function(data){
      var field = data.field; // 获取表单字段值
      task = field.task;
      language = field.language;
      temperature = field.temperature;
      best_of = field.best_of;
      beam_size = field.beam_size;
      
      if (field.vad_filter === 'on') {
        vad_filter = 'True';
      }

      min_silence_duration_ms = field.min_silence_duration_ms;

      if (field.word_timestamps === 'on') {
        word_timestamps = 'True';
      }

      hallucination_silence_threshold = field.hallucination_silence_threshold;
      speaker = field.speaker;
      speed = parseFloat(field.speed);

      if (speaker.startsWith('EN')) {
        tts_language = 'EN';
      } else {
        tts_language = speaker;
        speaker = 'None';
      }

      layer.msg("提交成功");
      return false; // 阻止默认 form 跳转
  });

  $('#send-btn').on('click', function() {
    var userInputContent = $('#content').val();
    const sendTime = new Date().toLocaleString();
    displayResult(userInputContent, sendTime, 'sent')
    $.ajax({
      type: 'POST',
      url: 'http://127.0.0.1/api/llm',
      data: ({question: userInputContent}),
      success: function(response) {
        if (response.code === 200) {
          const llm_result = response.data.text;
          const currentTime = new Date().toLocaleString();
          displayResult(llm_result, currentTime, 'received');
          
          TTS_URL = "http://127.0.0.1/tts/stream";
          const ttsBody = JSON.stringify({text: llm_result, language: tts_language, speaker: speaker, speed: speed});
          fetch(TTS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: ttsBody,
          })
          .then(response => {
            if (response.ok) {
              return response.blob();
            } else {
              throw new Error("请求 TTS 接口失败");
            }
          })
          .then(audioBlob => {
            // const audioUrl = URL.createObjectURL(audioBlob);
            playAudio(audioBlob);
          })
          .catch(error => {
            console.error("TTS 接口发生错误:", error);
          });
          
        } else {
          console.error('LLM 接口返回错误信息', response.code, response.message);
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error('失败:', textStatus, errorThrown);
      }
    });
    $('#content').val('');
  });

  $('#interrupt-audio-btn').on('click', function() {
    interruptAudio();
  });
});

const recordBtn = document.querySelector(".record-btn");
const contentDiv = document.querySelector('#content');
const asr_engine = localStorage.getItem('asr_engine');

function displayResult(result, timestamp, type) {
  const chatBox = document.querySelector('.chat-box');
  const chatMessage = document.createElement('div');
  chatMessage.classList.add('chat-message', type);
  
  const timeElement = document.createElement('div');
  timeElement.classList.add('chat-time');
  timeElement.textContent = timestamp;
  
  const contentElement = document.createElement('div');
  contentElement.classList.add('chat-content');
  contentElement.textContent = result;
  
  chatMessage.appendChild(timeElement);
  chatMessage.appendChild(contentElement);
  chatBox.appendChild(chatMessage);
}

// function playAudio(audioUrl) {
//   const audio = new Audio(audioUrl);
//   audio.play();
// }

let currentAudio = null;

function playAudio(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);

    // 如果当前有正在播放的音频,先停止它
    if (currentAudio) {
        currentAudio.pause(); // 暂停当前音频
        currentAudio = null;  // 清除当前音频引用
    }

    currentAudio = new Audio(audioUrl);
    currentAudio.play();
}

function interruptAudio() {
  if (currentAudio) {
      currentAudio.pause(); // 暂停当前音频
      currentAudio.currentTime = 0; // 可选: 重置播放进度
      currentAudio = null; // 清除当前音频引用
  }
}

if (navigator.mediaDevices.getUserMedia) {
  let chunks = [];
  const constraints = { audio: true };
  let mediaRecorder;

  navigator.mediaDevices.getUserMedia(constraints).then(
    stream => {
      console.log("授权成功！");

      mediaRecorder = new MediaRecorder(stream);

      recordBtn.addEventListener('mousedown', () => {
        if (mediaRecorder.state !== "recording") {
          mediaRecorder.start();
          console.log("录音中...");
          recordBtn.textContent = "停止";
        }
      });

      recordBtn.addEventListener('mouseup', () => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          console.log("录音结束");
          recordBtn.textContent = "录制";
        }
      });

      mediaRecorder.ondataavailable = e => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = e => {
        const blob = new Blob(chunks, { type: "audio/wav; codecs=opus" });
        chunks = [];
        const formData = new FormData();
        formData.append("file", blob, "recording.wav");
        formData.append("task", task)
        formData.append("asr_engine", asr_engine);
        formData.append("temperature", temperature);
        formData.append("best_of", best_of);
        formData.append("beam_size", beam_size);
        formData.append("language", language);
        formData.append("vad_filter", vad_filter);
        formData.append("min_silence_duration_ms", min_silence_duration_ms);
        formData.append("word_timestamps", word_timestamps);
        formData.append("hallucination_silence_threshold", hallucination_silence_threshold);
        const uploadUrl = "http://127.0.0.1/api/transcript";
        fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error("音频上传失败");
          }
        })
        .then(jsonResponse => {
          console.log("音频上传成功，返回数据：", jsonResponse);
          if (jsonResponse.code === 200) {
            const result = jsonResponse.data.text
            const currentTime = new Date().toLocaleString();
            displayResult(result, currentTime, 'sent');
            // 调用 LLM
            LLM_URL = "http://127.0.0.1/api/llm";
            const llm_body = new FormData();
            llm_body.append("question", result);
            fetch(LLM_URL, {
              method: "POST",
              body: llm_body,
            })
            .then(response => {
              if (response.ok) {
                return response.json();
              } else {
                throw new Error("请求 LLM 接口失败");
              }
            })
            .then(llmResponse => {
              if (llmResponse.code === 200) {
                const llm_result = llmResponse.data.text;
                const currentTime = new Date().toLocaleString();
                displayResult(llm_result, currentTime, 'received');
                // 调用 TTS 接口
                TTS_URL = "http://127.0.0.1/tts/stream";
                const ttsBody = JSON.stringify({text: llm_result, language: tts_language, speaker: speaker, speed: speed});
                fetch(TTS_URL, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: ttsBody,
                })
                .then(response => {
                  if (response.ok) {
                    return response.blob();
                  } else {
                    throw new Error("请求 TTS 接口失败");
                  }
                })
                .then(audioBlob => {
                  // const audioUrl = URL.createObjectURL(audioBlob);
                  playAudio(audioBlob);
                })
                .catch(error => {
                  console.error("TTS 接口发生错误:", error);
                });
              } else {
                console.error("LLM 接口返回错误信息：", llmResponse.message);
              }
            })
          }
        })
        .catch(error => {
          console.error("音频上传发生错误：", error);
        });
      };
    },
    () => {
      console.error("授权失败！");
    }
  );
} else {
  console.error("浏览器不支持 getUserMedia");
}
