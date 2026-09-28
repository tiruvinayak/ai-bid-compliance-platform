package com.sih.gem.verification;

/**
 * Phase 5A — HTTP gateway used only by configured provider adapters.
 * Kept behind an interface so provider failure handling can be tested
 * without network access.
 */
public interface VerificationHttpClient {

    /**
     * Performs an authenticated GET against a configured provider endpoint.
     *
     * @param url    fully built provider URL (endpoint + query)
     * @param apiKey provider API key, sent as a Bearer token — never logged
     * @return raw response body
     * @throws RuntimeException on transport or non-2xx responses
     */
    String get(String url, String apiKey);
}
