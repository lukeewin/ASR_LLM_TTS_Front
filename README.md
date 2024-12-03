# 0. 项目说明
ASR_LLM_TTS 的前端项目

对应的后端接口可以访问 https://github.com/lukeewin/ASR_LLM_TTS.git

# 1. 运行
安装 nginx，然后修改 nginx.conf，如下所示：
```shell
server {
        listen       80;
        server_name  localhost;

        location / {
            root   D:\\Works\\Web_Projects\\ASR_LLM_TTS\\top\\lukeewin\\;
            index  login.html index.htm;
        }

		location /api {
				proxy_pass http://localhost:8000;
				proxy_set_header Host $host;
				proxy_set_header X-Real-IP $remote_addr;
		}
		
		location /tts {
				proxy_pass http://localhost:8001;
				proxy_set_header Host $host;
				proxy_set_header X-Real-IP $remote_addr;
		}
}
```
其中`D:\\Works\\Web_Projects\\ASR_LLM_TTS\\top\\lukeewin\\`是你前端项目的位置，`http://localhost:8000`是`ASR`和`LLM`的接口地址，`http://localhost:8001`是`TTS`接口地址。
当我们前端请求 http://localhost/api/xxx 的时候，会把请求转发到 http://localhost:8000 地址，同理我们请求 http://localhost/tts/xxx 的时候，会把请求转发到 http://localhost:8001 地址。

这里需要注意：如果部署到公网中，一定要记得修改前端代码中的代码，把 127.0.0.1 替换为你的公网 ip，并且还需要注意，一定要使用 SSL 证书，也就是必须要通过 https 协议访问，否则不能调用本地麦克风。

更多详细内容欢迎访问我的博客 https://blog.lukeewin.top
