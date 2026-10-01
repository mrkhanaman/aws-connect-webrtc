import {
    ConsoleLogger,
    DefaultDeviceController,
    DefaultMeetingSession,
    LogLevel,
    MeetingSessionConfiguration
} from "amazon-chime-sdk-js";

const status = document.getElementById("status");

const logger = new ConsoleLogger(
    "AWS-WebRTC-PoC",
    LogLevel.INFO
);

const deviceController =
    new DefaultDeviceController(logger);

let meetingSession = null;

async function startWebRTC() {

    try {

        status.textContent =
            "Loading Amazon Connect WebRTC session...";

// --------------------------------------------------
// 1. Start Amazon Connect WebRTC contact
// --------------------------------------------------

const response = await fetch("/api/start-contact", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        display_name: "Asterisk-WebRTC-PoC"
    })
});

if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
        `WebRTC Gateway error ${response.status}: ${errorText}`
    );
}

const data = await response.json();

console.log(
    "Amazon Connect WebRTC contact created."
);

console.log(
    "Contact ID:",
    data.contact_id
);

console.log(
    "Participant ID:",
    data.participant_id
);

console.log(
    "Meeting ID:",
    data.connection_data.Meeting.MeetingId
);

// Convert the Gateway response into the
// structure expected by the Chime SDK code.

const session = {
    contactId: data.contact_id,
    participantId: data.participant_id,
    meeting: data.connection_data.Meeting,
    attendee: data.connection_data.Attendee
};

        console.log(
            "Amazon Connect session received."
        );

        console.log(
            "Contact ID:",
            session.contactId
        );

        console.log(
            "Participant ID:",
            session.participantId
        );

        // --------------------------------------------------
        // 2. Create Chime MeetingSession
        // --------------------------------------------------

        const configuration =
            new MeetingSessionConfiguration(
                session.meeting,
                session.attendee
            );

        meetingSession =
            new DefaultMeetingSession(
                configuration,
                logger,
                deviceController
            );

        console.log(
            "Chime SDK MeetingSession created."
        );

        // --------------------------------------------------
        // 3. Bind remote audio
        // --------------------------------------------------

        const audioElement =
            document.getElementById(
                "remoteAudio"
            );

        meetingSession.audioVideo.bindAudioElement(
            audioElement
        );

        console.log(
            "Remote audio element bound."
        );

        // --------------------------------------------------
        // 4. Register observer
        // --------------------------------------------------

        meetingSession.audioVideo.addObserver({

            audioVideoDidStart: () => {

                console.log(
                    "AudioVideoDidStart"
                );

                status.textContent =
                    "WebRTC connected. Waiting for agent...";
            },

            audioVideoDidStop: (sessionStatus) => {

                console.log(
                    "AudioVideoDidStop:",
                    sessionStatus
                );

                status.textContent =
                    "WebRTC session stopped.";
            },

            connectionDidBecomePoor: () => {

                console.warn(
                    "WebRTC connection became poor."
                );
            },

            connectionDidRecover: () => {

                console.log(
                    "WebRTC connection recovered."
                );
            }
        });

        // --------------------------------------------------
        // 5. Get microphone devices
        // --------------------------------------------------

        const audioInputs =
            await meetingSession.audioVideo
                .listAudioInputDevices();

        console.log(
            "Available audio input devices:",
            audioInputs
        );

        if (audioInputs.length === 0) {

            throw new Error(
                "No microphone detected."
            );
        }

        // --------------------------------------------------
        // 6. Start microphone
        // --------------------------------------------------

        await meetingSession.audioVideo
            .startAudioInput(
                audioInputs[0].deviceId
            );

        console.log(
            "Microphone selected:",
            audioInputs[0]
        );

        // --------------------------------------------------
        // 7. Start WebRTC
        // --------------------------------------------------

        status.textContent =
            "Starting WebRTC session...";

        await meetingSession.audioVideo.start();

        console.log(
            "WebRTC session started successfully."
        );
        // --------------------------------------------------
        // 8. Start reverse audio (agent → Asterisk)
        // --------------------------------------------------

        startReverseAudio(meetingSession);

    }
    catch (error) {

        console.error(
            "WebRTC connection failed:",
            error
        );

        status.textContent =
            `WebRTC connection failed: ${error.message}`;
    }
}
// --------------------------------------------------
// Reverse audio: capture agent audio from WebRTC
// and send PCM to Python gateway via WebSocket
// --------------------------------------------------

function startReverseAudio(meetingSession) {

    // Open WebSocket connection to Python gateway
    const ws = new WebSocket("ws://127.0.0.1:9020");

    ws.addEventListener("open", () => {
        console.log("Reverse audio WebSocket connected.");
    });

    ws.addEventListener("error", (err) => {
        console.error("Reverse audio WebSocket error:", err);
    });

    ws.addEventListener("close", () => {
        console.warn("Reverse audio WebSocket closed.");
    });

    // Create Web Audio context at 8000 Hz
    // to match Asterisk AudioSocket sample rate
    const audioContext = new AudioContext({ sampleRate: 8000 });

    // Get the remote audio stream coming from Amazon Connect agent
    const remoteStream = meetingSession.audioVideo
        .getCurrentMeetingAudioStream();

    if (!remoteStream) {
        console.error("No remote audio stream available.");
        return;
    }

    // Connect the remote stream into the Web Audio graph
    const source = audioContext.createMediaStreamSource(remoteStream);

    // ScriptProcessor processes audio in chunks
    // 512 samples per chunk, 1 input channel, 1 output channel
    const processor = audioContext.createScriptProcessor(512, 1, 1);

    processor.onaudioprocess = (event) => {

        // getChannelData(0) gives us Float32 samples (-1.0 to +1.0)
        const float32 = event.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 PCM (what Asterisk expects)
        const int16 = new Int16Array(float32.length);

        for (let i = 0; i < float32.length; i++) {
            // Clamp value between -1 and 1, then scale to Int16 range
            const clamped = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = clamped * 32767;
        }

        // Send raw PCM bytes over WebSocket if connection is open
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(int16.buffer);
        }
    };

    // Wire up the audio graph
    source.connect(processor);
    processor.connect(audioContext.destination);

    console.log("Reverse audio capture started.");
}

startWebRTC();