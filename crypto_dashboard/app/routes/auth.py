from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.services.db import get_db
from app.services.auth import User, get_password_hash, verify_password, create_access_token, get_current_user
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already registered")
        
        hashed_password = get_password_hash(user.password)
        new_user = User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password
        )
        db.add(new_user)
        db.commit()
        
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        # Add debug logging
        print(f"Login attempt for username: {form_data.username}")
        
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user:
            print(f"User not found: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not verify_password(form_data.password, user.hashed_password):
            print(f"Invalid password for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "is_admin": user.is_admin
        }
    except Exception as e:
        print(f"Login error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=500,
            detail=f"Login error: {str(e)}"
        )

@router.post("/test-user")
async def create_test_user(db: Session = Depends(get_db)):
    """Create a test user for development"""
    username = "test_user"
    password = "test_password"
    email = "test@example.com"
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_admin=False  # Set admin status
        )
        db.add(new_user)
        db.commit()
    
    form_data = OAuth2PasswordRequestForm(username=username, password=password, scope="")
    token = await login(form_data, db)
    return {
        "access_token": token["access_token"],
        "token_type": token["token_type"],
        "is_admin": user.is_admin if user else False
    }

@router.post("/create-admin")
async def create_admin(
    user: UserCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    hashed_password = get_password_hash(user.password)
    new_admin = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=True
    )
    db.add(new_admin)
    db.commit()
    return {"message": "Admin created successfully"}

@router.get("/validate")
async def validate_token(current_user: User = Depends(get_current_user)):
    try:
        return {
            "valid": True,
            "username": current_user.username,
            "is_admin": current_user.is_admin
        }
    except Exception as e:
        print(f"Token validation error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )