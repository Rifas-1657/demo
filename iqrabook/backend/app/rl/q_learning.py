"""
IqraBook — Q-Learning RL Adaptive Tutor
Adjusts teaching style based on student engagement.

Token optimization: RL runs locally (pure NumPy), zero API calls.
States: (skill_level_bin × attention_bin) = 3×3 = 9 states
Actions: 6 teaching strategies
"""
from __future__ import annotations

import json
import math
import random
import logging
from typing import Literal

import numpy as np

logger = logging.getLogger(__name__)

# ── Action Space ──────────────────────────────────────────────────
ACTIONS = [
    "increase_detail",
    "decrease_detail",
    "add_quiz",
    "more_diagrams",
    "add_example",
    "simplify",
]

# ── Constants ─────────────────────────────────────────────────────
SKILL_BINS = 3      # beginner / intermediate / advanced
ATTENTION_BINS = 3  # low / medium / high
N_STATES = SKILL_BINS * ATTENTION_BINS  # 9 states
N_ACTIONS = len(ACTIONS)

# Hyperparameters
ALPHA = 0.1         # learning rate
GAMMA = 0.9         # discount factor
EPSILON_MIN = 0.05  # minimum exploration
EPSILON_DECAY = 0.995


class IqraQLearning:
    """
    Q-Learning adaptive tutor for IqraBook.
    Persisted as JSON in the SQLite session record.
    Zero API cost — runs entirely locally.
    """

    def __init__(
        self,
        q_table_json: str = "{}",
        epsilon: float = 0.3,
    ):
        """
        Args:
            q_table_json: Serialized Q-table from DB session.
            epsilon: Current exploration rate.
        """
        loaded = json.loads(q_table_json) if q_table_json else {}
        if loaded:
            self.q_table = np.array(loaded["q_table"])
        else:
            # Initialize Q-table with small random values
            self.q_table = np.random.uniform(-0.1, 0.1, (N_STATES, N_ACTIONS))

        self.epsilon = max(epsilon, EPSILON_MIN)

    def _discretize_state(self, skill: float, attention: float) -> int:
        """
        Convert continuous skill/attention [0,1] to discrete state index.
        3×3 grid = 9 states.
        """
        skill_bin = min(int(skill * SKILL_BINS), SKILL_BINS - 1)
        att_bin = min(int(attention * ATTENTION_BINS), ATTENTION_BINS - 1)
        return skill_bin * ATTENTION_BINS + att_bin

    def select_action(self, skill: float, attention: float) -> str:
        """
        Epsilon-greedy action selection.
        Returns: action name string.
        """
        state = self._discretize_state(skill, attention)

        if random.random() < self.epsilon:
            # Explore: random action
            action_idx = random.randint(0, N_ACTIONS - 1)
        else:
            # Exploit: best known action
            action_idx = int(np.argmax(self.q_table[state]))

        return ACTIONS[action_idx]

    def update(
        self,
        skill: float,
        attention: float,
        action: str,
        reward: float,
        next_skill: float,
        next_attention: float,
    ) -> None:
        """
        Update Q-table using Bellman equation.
        Called after each teaching interaction when reward is received.
        """
        state = self._discretize_state(skill, attention)
        next_state = self._discretize_state(next_skill, next_attention)
        action_idx = ACTIONS.index(action)

        # Bellman update
        best_next = np.max(self.q_table[next_state])
        td_target = reward + GAMMA * best_next
        td_error = td_target - self.q_table[state, action_idx]
        self.q_table[state, action_idx] += ALPHA * td_error

        # Decay exploration
        self.epsilon = max(self.epsilon * EPSILON_DECAY, EPSILON_MIN)

        logger.debug(
            f"RL update: state={state}, action={action}, "
            f"reward={reward:.2f}, td_error={td_error:.3f}, "
            f"epsilon={self.epsilon:.3f}"
        )

    def calculate_reward(self, engagement_metrics: dict) -> float:
        """
        Calculate reward from engagement metrics.

        Positive rewards:
        - Code executed correctly: +1.0
        - User stayed on page (>30s): +0.5
        - Question answered: +0.3
        - User explicitly positive: +0.8

        Negative rewards:
        - User skipped quickly (<10s): -0.5
        - Off-topic question: -0.2
        - Code error: -0.1
        """
        reward = 0.0

        if engagement_metrics.get("code_success"):
            reward += 1.0
        if engagement_metrics.get("time_on_page", 0) > 30:
            reward += 0.5
        if engagement_metrics.get("question_asked"):
            reward += 0.3
        if engagement_metrics.get("explicit_positive"):
            reward += 0.8
        if engagement_metrics.get("time_on_page", 30) < 10:
            reward -= 0.5
        if engagement_metrics.get("off_topic_question"):
            reward -= 0.2
        if engagement_metrics.get("code_error"):
            reward -= 0.1

        return float(np.clip(reward, -1.0, 2.0))

    def to_json(self) -> str:
        """Serialize Q-table for storage in SQLite."""
        return json.dumps({
            "q_table": self.q_table.tolist(),
            "epsilon": float(self.epsilon),
        })

    @property
    def best_action_per_state(self) -> dict:
        """Debug helper — shows best action for each state."""
        result = {}
        for s in range(N_STATES):
            skill_bin = s // ATTENTION_BINS
            att_bin = s % ATTENTION_BINS
            best = ACTIONS[int(np.argmax(self.q_table[s]))]
            result[f"skill={skill_bin},att={att_bin}"] = best
        return result
