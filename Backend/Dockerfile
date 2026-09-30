# ==============================================================================
# Multi-stage Dockerfile for Spring Boot Backend (Java 21)
# ==============================================================================

# Stage 1: Build stage with Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy pom.xml and download dependencies for caching
COPY pom.xml .
RUN mvn dependency:go-offline || true

# Copy source code and build production JAR
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Copy compiled JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Create default upload directory
RUN mkdir -p /app/uploads

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
