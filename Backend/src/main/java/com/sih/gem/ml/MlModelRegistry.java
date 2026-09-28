package com.sih.gem.ml;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Phase 5B — Model registry loader.
 *
 * Reads classpath:ml/model-registry.json written by the Python training
 * pipeline (ai-service/ml/train_risk_model.py). Only a model whose status is
 * TRAINED with logistic-regression coefficients present becomes "active";
 * otherwise predictions report NOT_AVAILABLE — never a fabricated probability.
 */
@Component
public class MlModelRegistry {

    private static final Logger log = LoggerFactory.getLogger(MlModelRegistry.class);

    private final ModelDescriptor activeModel;

    // Spring must pick the ObjectMapper constructor (the fixture one is for tests only).
    @org.springframework.beans.factory.annotation.Autowired
    public MlModelRegistry(ObjectMapper objectMapper) {
        this.activeModel = load(objectMapper);
    }

    /** Test/fixture constructor — allows supplying a synthetic trained descriptor. */
    public MlModelRegistry(ModelDescriptor activeModel) {
        this.activeModel = activeModel;
    }

    // Spring must pick the ObjectMapper constructor (the fixture one is for tests only).

    public Optional<ModelDescriptor> activeModel() {
        return Optional.ofNullable(activeModel);
    }

    private static ModelDescriptor load(ObjectMapper mapper) {
        try (InputStream in = new ClassPathResource("ml/model-registry.json").getInputStream()) {
            RegistryFile file = mapper.readValue(in, RegistryFile.class);
            if (file == null || file.activeModelVersion == null || file.models == null) {
                return null;
            }
            for (ModelDescriptor m : file.models) {
                if (m == null || !file.activeModelVersion.equals(m.modelVersion)) continue;
                if (!"TRAINED".equalsIgnoreCase(m.status)) {
                    log.info("Model {} is not active (status={}): {}",
                            m.modelVersion, m.status, m.reason);
                    return null;
                }
                if (m.coefficients == null || m.coefficients.isEmpty() || m.intercept == null) {
                    log.warn("Model {} marked TRAINED but has no coefficients — treated as unavailable.",
                            m.modelVersion);
                    return null;
                }
                if (!"LOGISTIC_REGRESSION".equalsIgnoreCase(m.algorithm)) {
                    log.warn("Model {} uses algorithm {} which is not supported for inference — unavailable.",
                            m.modelVersion, m.algorithm);
                    return null;
                }
                if (m.featureMean == null || m.featureStd == null
                        || m.featureMean.size() != m.coefficients.size()
                        || m.featureStd.size() != m.coefficients.size()) {
                    log.warn("Model {} has inconsistent feature statistics — unavailable.", m.modelVersion);
                    return null;
                }
                return m;
            }
            return null;
        } catch (Exception e) {
            log.info("No usable trained model in registry ({}). ML risk will report NOT_AVAILABLE.",
                    e.getMessage());
            return null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RegistryFile {
        public String activeModelVersion;
        public List<ModelDescriptor> models;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ModelDescriptor {
        public String modelVersion;
        public String featureVersion;
        public String status;
        public String algorithm;
        public String trainingTimestamp;
        public String datasetVersion;
        public Map<String, Double> metrics;
        public Double intercept;
        public List<Double> coefficients;
        public List<Double> featureMean;
        public List<Double> featureStd;
        public Double thresholdMedium = 0.33;
        public Double thresholdHigh = 0.66;
        public String reason;

        public ModelDescriptor() {}

        public ModelDescriptor(String modelVersion, String featureVersion, String status, String algorithm,
                               String trainingTimestamp, String datasetVersion, Map<String, Double> metrics,
                               Double intercept, List<Double> coefficients,
                               List<Double> featureMean, List<Double> featureStd,
                               Double thresholdMedium, Double thresholdHigh, String reason) {
            this.modelVersion = modelVersion;
            this.featureVersion = featureVersion;
            this.status = status;
            this.algorithm = algorithm;
            this.trainingTimestamp = trainingTimestamp;
            this.datasetVersion = datasetVersion;
            this.metrics = metrics;
            this.intercept = intercept;
            this.coefficients = coefficients != null ? List.copyOf(coefficients) : Collections.emptyList();
            this.featureMean = featureMean != null ? List.copyOf(featureMean) : null;
            this.featureStd = featureStd != null ? List.copyOf(featureStd) : null;
            this.thresholdMedium = thresholdMedium;
            this.thresholdHigh = thresholdHigh;
            this.reason = reason;
        }
    }
}
