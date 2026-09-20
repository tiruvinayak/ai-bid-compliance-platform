package com.sih.gem.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static resources from /static/** for actual static files (CSS, JS, images)
        // In development, the frontend is served by Vite on port 5175
        // In production, the built frontend is served from this location
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");

        // Serve favicon and other root-level static files
        registry.addResourceHandler("/favicon.ico", "/favicon.svg", "/robots.txt", "/manifest.json")
                .addResourceLocations("classpath:/static/");
    }
}
