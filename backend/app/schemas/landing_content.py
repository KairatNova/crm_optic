from pydantic import BaseModel, Field


class LandingContentRead(BaseModel):
    locale: str
    payload: dict


class LandingContentWrite(BaseModel):
    locale: str = Field(min_length=2, max_length=5)
    payload: dict
