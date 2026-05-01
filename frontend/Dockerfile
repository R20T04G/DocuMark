# Use the official Node image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install all dependencies (including dev tools)
COPY package*.json ./
RUN npm install

# Copy the rest of the code and compile the Next.js app
COPY . .
RUN npm run build

# Expose the port and start the compiled app
EXPOSE 3000
CMD ["npm", "start"]