# Step 1: Tell Docker to use a pre-made image that has Node.js installed
FROM node:22-alpine

# Step 2: Create a folder inside the "virtual" container for our app
WORKDIR /app

# Step 3: Copy our "shopping list" (package.json) and install the tools
COPY package*.json ./
RUN npm install

# Step 4: Copy all our actual code (like index.js) into the container
COPY . .

# Step 5: Tell the container which port to open (matches our code)
EXPOSE 5000

# Step 6: The command to start the server inside the container
CMD ["node", "index.js"]