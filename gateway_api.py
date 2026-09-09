import boto3

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# ============================================================
# Configuration
# Ensure the config.py file contains the following variables:
# AWS_REGION = "your-aws-region"
# CONNECT_INSTANCE_ID = "your-connect-instance-id"
# CONTACT_FLOW_ID = "your-contact-flow-id"
# ============================================================

from config import AWS_REGION, CONNECT_INSTANCE_ID, CONTACT_FLOW_ID

# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="AWS WebRTC Gateway",
    description="POC WebRTC Gateway for Amazon Connect",
    version="0.1.0",
)


# ============================================================
# Request model
# ============================================================

class StartContactRequest(BaseModel):
    display_name: str = "Asterisk-WebRTC-PoC"


# ============================================================
# AWS Connect client
# ============================================================

connect_client = boto3.client(
    "connect",
    region_name=AWS_REGION,
)


# ============================================================
# Health check
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "aws-webrtc-gateway",
    }


# ============================================================
# Start Amazon Connect WebRTC contact
# ============================================================

@app.post("/api/start-contact")
def start_contact(request: StartContactRequest):

    try:
        response = connect_client.start_web_rtc_contact(
            InstanceId=CONNECT_INSTANCE_ID,
            ContactFlowId=CONTACT_FLOW_ID,
            ParticipantDetails={
                "DisplayName": request.display_name
            },
        )

        return {
            "status": "success",
            "contact_id": response["ContactId"],
            "participant_id": response["ParticipantId"],
            "participant_token": response["ParticipantToken"],
            "connection_data": response["ConnectionData"],
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )