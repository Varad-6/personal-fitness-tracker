import sys
import os

# Add root folder to sys.path so Vercel can resolve local imports like 'backend.main'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
