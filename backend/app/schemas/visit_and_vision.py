from pydantic import BaseModel

from app.schemas.visit import VisitCreate, VisitRead
from app.schemas.vision_test import VisionTestCreate, VisionTestRead


class VisitAndVisionCreateIn(BaseModel):
    visit: VisitCreate
    vision_test: VisionTestCreate


class VisitAndVisionCreateOut(BaseModel):
    visit: VisitRead
    vision_test: VisionTestRead

