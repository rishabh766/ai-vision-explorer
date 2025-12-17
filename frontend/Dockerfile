# 1. Use an official Node.js image (like having Node installed)
FROM node:18-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package.json (the Node shopping list)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the frontend code
COPY . .

# 6. Start the development server
# --host is needed to expose the server outside the container
CMD ["npm", "run", "dev", "--", "--host"]