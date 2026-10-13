from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    current_topic_index = Column(Integer, default=0)
    current_subtopic = Column(String, nullable=True)
    knowledge_state_json = Column(Text, nullable=True) # JSON - RL knowledge vector
    rl_q_table_json = Column(Text, nullable=True) # JSON - serialized Q-table
    rl_epsilon = Column(Float, default=0.2)
    total_time_spent = Column(Integer, default=0) # seconds
    completed_topics_json = Column(Text, nullable=True) # JSON array
    qa_history_json = Column(Text, nullable=True) # JSON array of last 10 Q&As
    survey_results_json = Column(Text, nullable=True) # JSON
    
    last_session_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="sessions")
    course = relationship("Course", backref="sessions")
