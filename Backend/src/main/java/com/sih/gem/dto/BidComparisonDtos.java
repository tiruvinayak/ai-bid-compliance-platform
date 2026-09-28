package com.sih.gem.dto;

import java.util.List;

/**
 * Phase 4 — Multi-Bidder Comparison & Decision Support DTOs.
 * Factual aggregation only: no rankings, no winner, no fabricated scores.
 */
public final class BidComparisonDtos {

    private BidComparisonDtos() {}

    public record BidComparisonResponse(
            String tenderId,
            String tenderTitle,
            String departmentName,
            String sectorName,
            int bidCount,
            List<BidderComparisonDto> bidders,
            List<RequirementMatrixRowDto> requirements,
            List<DocumentCoverageRowDto> documentCoverage
    ) {}

    public record BidderComparisonDto(
            String bidId,
            String bidderName,
            String status,
            PreliminaryComparisonDto preliminary,
            ComplianceCountsDto compliance,
            RiskCountsDto risk,
            int conflictCount,
            List<ConflictSummaryDto> conflicts,
            List<String> documentTypes
    ) {}

    public record PreliminaryComparisonDto(
            String overallStatus,
            int total,
            int pass,
            int review,
            int fail,
            int missing,
            int conflict
    ) {}

    public record ComplianceCountsDto(
            int total,
            int pass,
            int review,
            int fail,
            int missing,
            int conflict,
            Double coveragePercent
    ) {}

    public record RiskCountsDto(
            int high,
            int medium,
            int low,
            int total
    ) {}

    public record ConflictSummaryDto(
            String conflictId,
            String requirementId,
            String conflictType,
            String title,
            String status,
            String riskLevel,
            List<String> sources
    ) {}

    public record RequirementMatrixRowDto(
            String requirementId,
            String description,
            String category,
            String requiredValue,
            Boolean mandatory,
            List<RequirementCellDto> cells
    ) {}

    public record RequirementCellDto(
            String bidId,
            String status,
            String expectedValue,
            String actualValue,
            String reason,
            String document,
            Integer page,
            boolean hasEvidence,
            String evidenceDocument,
            Integer evidencePage,
            String evidenceSnippet
    ) {}

    public record DocumentCoverageRowDto(
            String category,
            List<DocumentCoverageCellDto> cells
    ) {}

    public record DocumentCoverageCellDto(
            String bidId,
            boolean present,
            int count
    ) {}
}
