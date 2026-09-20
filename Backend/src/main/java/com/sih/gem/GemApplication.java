package com.sih.gem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class GemApplication {

    public static void main(String[] args) {
        SpringApplication.run(GemApplication.class, args);
        System.out.println("""
                
                ============================================================
                  GeM Bid Compliance & Verification System (SIH26100)
                  Backend started successfully on http://localhost:8080
                  H2 Console: http://localhost:8080/h2-console
                ============================================================
                """);
    }
}
