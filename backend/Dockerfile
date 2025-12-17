# 1. Use an official lightweight Python image
FROM python:3.10-slim

# 2. Set the working directory inside the container to /app
WORKDIR /app

# (DELETED THE APT-GET BLOCK HERE)

# 4. Copy the "Shopping List" and install ingredients
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your backend code into the container
COPY . .

# 6. The command to start the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]