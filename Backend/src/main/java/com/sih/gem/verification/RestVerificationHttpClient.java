package com.sih.gem.verification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Phase 5A — Default HTTP implementation of {@link VerificationHttpClient}.
 * Only invoked when a provider is explicitly configured; unconfigured
 * providers never reach this class.
 */
@Component
public class RestVerificationHttpClient implements VerificationHttpClient {

    private final RestClient restClient;

    public RestVerificationHttpClient(
            @Value("${app.verification.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${app.verification.read-timeout-ms:5000}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public String get(String url, String apiKey) {
        return restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .header(HttpHeaders.ACCEPT, "application/json")
                .retrieve()
                .body(String.class);
    }
}
