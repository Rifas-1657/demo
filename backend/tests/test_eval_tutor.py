"""
tests/test_eval_tutor.py

Tests for tutor evaluation script.
"""
import json
import pytest
from pathlib import Path

from scripts.eval_tutor import evaluate_question, check_citation, run_evaluation
from app.llm.providers.mock import MockLLMProvider


@pytest.mark.asyncio
async def test_check_citation():
    """Test citation detection."""
    assert check_citation("This is a fact [Source: doc123]")
    assert check_citation("Multiple [Source: abc] facts [Source: xyz]")
    assert not check_citation("No citation here")
    assert not check_citation("[source: lowercase]")  # case sensitive


@pytest.mark.asyncio
async def test_evaluate_in_scope_question():
    """Test evaluation of in-scope Python question."""
    question = {
        "id": "test_001",
        "category": "in_scope",
        "language": "english",
        "question": "What is a list in Python?",
        "expected_behavior": "answer",
        "notes": "Should answer"
    }
    
    mock_llm = MockLLMProvider()
    result = await evaluate_question(question, llm_router=mock_llm, verbose=False)
    
    assert result.question_id == "test_001"
    assert result.category == "in_scope"
    # With mock, we just check it completes (may have errors due to mock format)
    assert result.response_time_ms > 0


@pytest.mark.asyncio
async def test_evaluate_out_of_scope_question():
    """Test evaluation of out-of-scope question."""
    question = {
        "id": "test_002",
        "category": "out_of_scope",
        "language": "english",
        "question": "What is the capital of France?",
        "expected_behavior": "refuse",
        "notes": "Should refuse"
    }
    
    mock_llm = MockLLMProvider()
    result = await evaluate_question(question, llm_router=mock_llm, verbose=False)
    
    assert result.question_id == "test_002"
    assert result.category == "out_of_scope"
    # Check it completed
    assert result.response_time_ms > 0


@pytest.mark.asyncio
async def test_evaluate_kb_grounded_question():
    """Test evaluation of KB-grounded question."""
    question = {
        "id": "test_003",
        "category": "kb_grounded",
        "language": "english",
        "question": "What courses does Bookey offer?",
        "expected_behavior": "answer_with_citation",
        "notes": "Should cite KB"
    }
    
    mock_llm = MockLLMProvider()
    result = await evaluate_question(question, llm_router=mock_llm, verbose=False)
    
    assert result.question_id == "test_003"
    assert result.category == "kb_grounded"
    # Check it completed
    assert result.response_time_ms > 0


@pytest.mark.asyncio
async def test_run_evaluation_small_dataset(tmp_path):
    """Test running evaluation on a small dataset."""
    # Create a small test dataset
    dataset = {
        "meta": {
            "description": "Small test dataset",
            "total_questions": 3
        },
        "questions": [
            {
                "id": "test_001",
                "category": "in_scope",
                "language": "english",
                "question": "What is Python?",
                "expected_behavior": "answer",
                "notes": "Test"
            },
            {
                "id": "test_002",
                "category": "out_of_scope",
                "language": "english",
                "question": "What is Java?",
                "expected_behavior": "refuse",
                "notes": "Test"
            },
            {
                "id": "test_003",
                "category": "kb_grounded",
                "language": "english",
                "question": "What is Bookey?",
                "expected_behavior": "answer_with_citation",
                "notes": "Test"
            }
        ]
    }
    
    dataset_path = tmp_path / "test_eval.json"
    with open(dataset_path, "w") as f:
        json.dump(dataset, f)
    
    # Run evaluation with mock
    summary = await run_evaluation(
        dataset_path=dataset_path,
        category_filter=None,
        verbose=False,
        use_mock=True,
    )
    
    # Check summary structure
    assert "total_questions" in summary
    assert summary["total_questions"] == 3
    assert "overall_success" in summary
    assert "overall_success_rate" in summary
    assert "by_category" in summary
    assert "results" in summary
    assert len(summary["results"]) == 3
    
    # Check categories present
    assert "in_scope" in summary["by_category"]
    assert "out_of_scope" in summary["by_category"]
    assert "kb_grounded" in summary["by_category"]


@pytest.mark.asyncio
async def test_category_filter(tmp_path):
    """Test filtering by category."""
    dataset = {
        "meta": {"total_questions": 2},
        "questions": [
            {
                "id": "test_001",
                "category": "in_scope",
                "question": "What is Python?",
                "expected_behavior": "answer",
                "notes": "Test"
            },
            {
                "id": "test_002",
                "category": "out_of_scope",
                "question": "What is Java?",
                "expected_behavior": "refuse",
                "notes": "Test"
            }
        ]
    }
    
    dataset_path = tmp_path / "test_filter.json"
    with open(dataset_path, "w") as f:
        json.dump(dataset, f)
    
    # Run with filter
    summary = await run_evaluation(
        dataset_path=dataset_path,
        category_filter="in_scope",
        verbose=False,
        use_mock=True,
    )
    
    # Should only have 1 question
    assert summary["total_questions"] == 1
    assert len(summary["results"]) == 1
    assert summary["results"][0]["category"] == "in_scope"
