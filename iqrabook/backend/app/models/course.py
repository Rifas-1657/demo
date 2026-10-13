from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from app.db.database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    total_topics = Column(Integer, default=0)
    roadmap_json = Column(Text, nullable=True) # JSON string
    github_repos_json = Column(Text, nullable=True) # JSON array of URLs
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
