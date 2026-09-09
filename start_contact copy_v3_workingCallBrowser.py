import json
from pathlib import Path

import boto3

from config import (
    AWS_REGION,
    CONNECT_INSTANCE_ID,
    CONTACT_FLOW_ID,
)


WEBRTC_CLIENT_DIR = Path(__file__).parent / "webrtc-client"
SESSION_FILE = WEBRTC_CLIENT_DIR / "public" / "session.json"


def start_webrtc_contact():
    connect = boto3.client(
        "connect",
        region_name=AWS_REGION,
    )

    response = connect.start_web_rtc_contact(
        InstanceId=CONNECT_INSTANCE_ID,
        ContactFlowId=CONTACT_FLOW_ID,
        ParticipantDetails={
            "DisplayName": "Python-WebRTC-PoC",
        },
    )

    return response


def save_session(response):
    session_data = {
        "meeting": response["ConnectionData"]["Meeting"],
        "attendee": response["ConnectionData"]["Attendee"],
        "contactId": response["ContactId"],
        "participantId": response["ParticipantId"],
    }

    SESSION_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(SESSION_FILE, "w", encoding="utf-8") as file:
        json.dump(
            session_data,
            file,
            indent=2,
        )


if __name__ == "__main__":
    response = start_webrtc_contact()

    save_session(response)

    print("WebRTC contact created successfully.")
    print("Contact ID     :", response["ContactId"])
    print("Participant ID :", response["ParticipantId"])
    print()
    print("Session data saved for the WebRTC client.")