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

startWebRTC();