package com.sih.gem.controller;

import com.sih.gem.dto.HierarchyDtos.*;
import com.sih.gem.service.HierarchyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class HierarchyController {

    private final HierarchyService hierarchyService;

    public HierarchyController(HierarchyService hierarchyService) {
        this.hierarchyService = hierarchyService;
    }

    @GetMapping("/government/overview")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<CentralOverviewDto> getCentralOverview() {
        return ResponseEntity.ok(hierarchyService.getCentralOverview());
    }

    @GetMapping("/sectors")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<List<SectorSummaryDto>> listSectors() {
        return ResponseEntity.ok(hierarchyService.listSectors());
    }

    @GetMapping("/sectors/{sectorId}")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<SectorDetailDto> getSector(@PathVariable Long sectorId) {
        return ResponseEntity.ok(hierarchyService.getSector(sectorId));
    }

    @GetMapping("/sectors/{sectorId}/departments")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<List<DepartmentSummaryDto>> listDepartments(@PathVariable Long sectorId) {
        return ResponseEntity.ok(hierarchyService.listDepartmentsForSector(sectorId));
    }

    @GetMapping("/departments/{departmentId}")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<DepartmentDetailDto> getDepartment(@PathVariable Long departmentId) {
        return ResponseEntity.ok(hierarchyService.getDepartment(departmentId));
    }

    @GetMapping("/departments/{departmentId}/tenders")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<List<TenderListItemDto>> listDepartmentTenders(@PathVariable Long departmentId) {
        return ResponseEntity.ok(hierarchyService.listTendersForDepartment(departmentId));
    }

    @GetMapping("/tenders")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<List<TenderListItemDto>> listTenders(
            @RequestParam(required = false) Long sectorId,
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(hierarchyService.listTenders(sectorId, departmentId));
    }

    @GetMapping("/tenders/{tenderId}")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<TenderListItemDto> getTender(@PathVariable String tenderId) {
        return ResponseEntity.ok(hierarchyService.getTender(tenderId));
    }
}
