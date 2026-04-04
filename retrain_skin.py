import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from training.create_demo_models import create_skin_model

if __name__ == "__main__":
    create_skin_model()
