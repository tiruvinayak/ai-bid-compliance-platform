package com.sih.gem.verification;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Phase 5A — Configuration for external verification providers.
 * All providers default to disabled/empty so the deployment reports
 * UNAVAILABLE until real credentials are supplied via environment variables.
 * Never commit real credentials.
 */
@Component
@ConfigurationProperties(prefix = "app.verification")
public class VerificationProperties {

    public static final String UNCONFIGURED_MESSAGE =
            "Official verification provider credentials/API access are not configured.";

    private final Map<String, ProviderCredentials> providers = new HashMap<>();
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 5000;

    public Map<String, ProviderCredentials> getProviders() {
        return providers;
    }

    public void setProviders(Map<String, ProviderCredentials> providers) {
        this.providers.clear();
        if (providers != null) {
            this.providers.putAll(providers);
        }
    }

    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }

    public int getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(int readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }

    /** Null-safe lookup; unknown keys yield a disabled (unconfigured) credential block. */
    public ProviderCredentials provider(String key) {
        ProviderCredentials c = providers.get(key);
        return c != null ? c : new ProviderCredentials();
    }

    public static class ProviderCredentials {
        private boolean enabled = false;
        private String baseUrl = "";
        private String apiKey = "";
        private String mode = "production"; // production | sandbox

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }

        public String getMode() { return mode; }
        public void setMode(String mode) { this.mode = mode; }

        /** A provider is only callable when explicitly enabled AND endpoint + key are present. */
        public boolean isConfigured() {
            return enabled && notBlank(baseUrl) && notBlank(apiKey);
        }

        public boolean isSandbox() {
            return "sandbox".equalsIgnoreCase(mode);
        }

        private static boolean notBlank(String s) {
            return s != null && !s.isBlank();
        }
    }
}
