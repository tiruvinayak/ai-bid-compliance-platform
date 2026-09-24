package com.sih.gem.dto;

import java.util.List;

public class HierarchyDtos {

    public record SectorSummaryDto(
            Long id,
            String code,
            String name,
            String description,
            Boolean active,
            long departmentCount,
            long tenderCount,
            long activeTenderCount,
            long completedTenderCount
    ) {}

    public record SectorDetailDto(
            Long id,
            String code,
            String name,
            String description,
            Boolean active,
            long departmentCount,
            long tenderCount,
            long activeTenderCount,
            long completedTenderCount,
            List<DepartmentSummaryDto> departments
    ) {}

    public record DepartmentSummaryDto(
            Long id,
            Long sectorId,
            String sectorCode,
            String sectorName,
            String code,
            String name,
            String description,
            Boolean active,
            long tenderCount,
            long activeTenderCount,
            long completedTenderCount,
            long officerCount
    ) {}

    public record DepartmentDetailDto(
            Long id,
            Long sectorId,
            String sectorCode,
            String sectorName,
            String code,
            String name,
            String description,
            Boolean active,
            long tenderCount,
            long activeTenderCount,
            long completedTenderCount,
            List<OfficerSummaryDto> officers,
            List<TenderListItemDto> tenders
    ) {}

    public record OfficerSummaryDto(
            Long id,
            String name,
            String email,
            String designation,
            String officerId,
            String role
    ) {}

    public record TenderListItemDto(
            Long id,
            String tenderId,
            String title,
            String status,
            String category,
            String tenderDate,
            String closingDate,
            Long departmentId,
            String departmentName,
            Long sectorId,
            String sectorName,
            Long assignedOfficerId,
            String assignedOfficerName,
            long bidderCount,
            String complianceStatus,
            String primaryBidId
    ) {}

    public record CentralOverviewDto(
            long totalSectors,
            long totalDepartments,
            long totalTenders,
            long activeTenders,
            long completedTenders,
            List<SectorSummaryDto> sectors,
            List<TenderListItemDto> recentTenders
    ) {}
}
