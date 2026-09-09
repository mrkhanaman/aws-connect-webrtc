# AWS WebRTC Media Gateway POC

This project is a proof of concept to connect a SIP phone/Asterisk environment with Amazon Connect using WebRTC.

The main idea is to take the audio coming from a SIP extension, send it through Asterisk and a Python media gateway, and finally connect it to an Amazon Connect WebRTC contact using the Amazon Chime SDK.

The current POC is mainly focused on understanding the media flow and the integration between Asterisk, WebRTC, Amazon Chime SDK and Amazon Connect.

The objective my POC was to route the calls from **Avaya Agent dials 9xxx --> Avaya CM/SM --> SIP Trunk --> Asterisk PBX --> Python WebRTC Gateway --> Amazon Connect Customer --> Amazon Connect Agent** There are better alternative ways like routing the call directly to Amazon Connect Customer claimed "Phone Number"


## Learning Objective
This project is mainly being used to understand how a traditional SIP/telephony environment can be integrated with a cloud contact centre using WebRTC gateway (without forwarding the calls to Amazon Connect Phone numbers).

**SIP (any pbx or SIP server) --> Asterisk --> AudioSocket --> Python Media Gateway --> Websocket --> Browser WebRTC --> Amazon Chime SDK --> Amazon Connect Customer --> CCP**


---

# What I'm trying to achieve?

The target call flow is:

```
SIP Extension 1001
        |
		|
        v
    Asterisk
        |
        | AudioSocket
        |
		v
Python WebRTC Media Gateway
        |
		|
        | WebSocket / PCM audio
        |
		v
WebRTC Client
        |
		|
        | Amazon Chime SDK
        |
		v
Amazon Connect
        |
		|
        v
CCP Agent
```

The SIP extension dials **9000**.

Here, `9000` is an Asterisk dialplan extension. It is not an Amazon Connect API endpoint.

When the call reaches the AudioSocket application, the Python media gateway starts the WebRTC session and connects the call to Amazon Connect.



## Current status

The following part is working:

**SIP Extension 1001 → Asterisk → WebRTC → Amazon Connect → CCP Agent**

The CCP agent is able to hear the audio coming from extension 1001.

The reverse media path is the next part being worked on:

**CCP Agent → Amazon Connect → WebRTC → Python Media Gateway → Asterisk → SIP 1001**

The main challenge in the reverse direction is converting the WebRTC audio into the PCM format expected by the Asterisk AudioSocket connection.

---

## Project structure

```
aws-webrtc/
|
|-- .gitignore
|-- .python-version
|-- README.md
|-- pyproject.toml
|-- uv.lock
|
|-- config.py
|
|-- gateway_api.py
|-- gateway_api_v2_test.py
|-- gateway_api_v3_workingCallbrowser.py
|-- gateway_api-test.py
|
|-- main.py
|-- start_contact.py
|-- start_contact copy_v3_workingCallBrowser.py
|-- test_aws.py
|
|-- webrtc-client/
    |
    |-- public/
    |   |-- session.json
    |
    |── src/
    |   |-- app.js
    |   |-- app_v1_initialTest.js
    |   |-- app_v2_without_Microphone.js
    |   |-- app_v3_workingCallbrowser.js
    |
    |-- index.html
    |-- package.json
    |-- package-lock.json
    |-- vite.config.js
    |-- vite_config_bkp1.js

(Some files in the project are earlier versions and test files. They are kept for reference while developing the POC)
```

---

# Main Components

## 1. Asterisk

Asterisk is used as the SIP side of the POC.

The SIP extension dials:

*9000*

The Asterisk dialplan sends the call to the AudioSocket application.

Audio is exchanged with the Python gateway using AudioSocket.



## 2. Python WebRTC Gateway

The Python side is responsible for coordinating the different components.

The gateway:
- Receives the AudioSocket connection from Asterisk.
- Receives PCM audio from the SIP call.
- Starts the WebRTC client.
- Provides the WebRTC client with the Amazon Connect session information.
- Communicates with the browser using WebSocket.
- Acts as the bridge between Asterisk audio and the WebRTC client.

The main API file is:

*gateway_api.py*


## 3. Amazon Connect integration

The Python gateway calls the Amazon Connect WebRTC API.

The important API used in this POC is:


*StartWebRTCContact*


Amazon Connect returns the information required by the WebRTC client, including the meeting and attendee information.

The browser then creates an Amazon Chime SDK meeting session using this information.


## 4. Amazon Chime SDK

The WebRTC client uses: amazon-chime-sdk-js


The client creates a: 

*MeetingSessionConfiguration*


and then creates a: 

*DefaultMeetingSession*


The WebRTC session is then started using the Chime SDK.


Amazon Connect is responsible for creating the contact and providing the connection information.

The Chime SDK is responsible for establishing the WebRTC media session.



## 5. Audio flow
AudioSocket sends PCM audio frames from Asterisk to the Python gateway.

The Python gateway forwards this audio to the browser.

The browser creates a WebRTC-compatible audio stream and provides it to the Chime SDK.



## 6. Browser application

The browser application is under: 

*webrtc-client/

The main application is: 

*webrtc-client/src/app.js

The application is served using Vite.

The browser is launched in headless mode for this POC.

The WebRTC client communicates with the Python gateway through: WebSocket 127.0.0.1:9020


## 7. Local API

The Python gateway exposes: 

*POST /api/start-contact


This API starts the Amazon Connect WebRTC contact.


There is also a health check: 

*GET /health

	Example response:
```
		{
			"status": "ok",
			"service": "aws-webrtc-gateway"
		}
```



## 8. AWS-specific configuration is kept outside the Git repository.

The local configuration file is: 

*config.py

It contains values such as:

```
	AWS_REGION = "your-aws-region"
	CONNECT_INSTANCE_ID = "your-connect-instance-id"
	CONTACT_FLOW_ID = "your-contact-flow-id"
```



## 9. Session information

The WebRTC session information is stored locally during development.

For example: 

*webrtc-client/public/session.json

This file can contain temporary meeting and participant information.


---

# Running the project

## Python environment: Activate python virtual environment

*.\.venv\Scripts\Activate.ps1



## Start the gateway: Run the FastAPI gateway using the project's Python environment.

*python gateway_api.py


## Start the WebRTC client: start vite

*cd webrtc-client
*npm install
*npm run dev


---

# Important development notes
## Some areas still require further work:
- Reverse audio path.
- Audio resampling and format conversion.
- Better WebRTC session lifecycle handling.
- Error handling and retry logic.
- Amazon Connect API throttling handling.
- Proper cleanup of meetings and contacts.
- Secure handling of temporary participant/session information.
- Production-grade logging.
- Production-grade authentication and authorization.
- Network and firewall considerations for WebRTC.
- Replacement of deprecated browser audio APIs with AudioWorklet where required.


---

# ⚠ Disclaimer
**This repository is a personal proof of concept and learning project.

**It is not intended to be used directly as a production telephony or contact centre solution without additional security, scalability, monitoring, resiliency and compliance work.

