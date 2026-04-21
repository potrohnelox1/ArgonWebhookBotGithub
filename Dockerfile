FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Prisma folder and schema early (optional optimization)
COPY prisma ./prisma

# Copy the entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Copy rest of app
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

EXPOSE 3040

# Set the entrypoint script to run first
ENTRYPOINT ["/app/entrypoint.sh"]

# The default command to run after the entrypoint finishes
CMD ["npm", "run", "start"]