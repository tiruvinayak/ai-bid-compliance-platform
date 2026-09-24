package com.sih.gem.service;

import com.sih.gem.dto.HierarchyDtos.*;
import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class HierarchyService {

    private final SectorRepository sectorRepository;
    private final DepartmentRepository departmentRepository;
    private final TenderRepository tenderRepository;
    private final BidRepository bidRepository;
    private final UserRepository userRepository;

    public HierarchyService(SectorRepository sectorRepository,
                            DepartmentRepository departmentRepository,
                            TenderRepository tenderRepository,
                            BidRepository bidRepository,
                            UserRepository userRepository) {
        this.sectorRepository = sectorRepository;
        this.departmentRepository = departmentRepository;
        this.tenderRepository = tenderRepository;
        this.bidRepository = bidRepository;
        this.userRepository = userRepository;
    }

    public CentralOverviewDto getCentralOverview() {
        User current = requireCurrentUser();
        assertCanViewCentral(current);

        List<Sector> sectors = sectorRepository.findAllByOrderByNameAsc();
        List<SectorSummaryDto> summaries = sectors.stream()
                .filter(s -> canAccessSector(current, s.getId()))
                .map(this::toSectorSummary)
                .toList();

        long totalDepartments = summaries.stream().mapToLong(SectorSummaryDto::departmentCount).sum();
        long totalTenders = summaries.stream().mapToLong(SectorSummaryDto::tenderCount).sum();
        long activeTenders = summaries.stream().mapToLong(SectorSummaryDto::activeTenderCount).sum();
        long completedTenders = summaries.stream().mapToLong(SectorSummaryDto::completedTenderCount).sum();

        List<TenderListItemDto> recent = resolveAccessibleTenders(current).stream()
                .limit(8)
                .map(this::toTenderListItem)
                .toList();

        return new CentralOverviewDto(
                summaries.size(),
                totalDepartments,
                totalTenders,
                activeTenders,
                completedTenders,
                summaries,
                recent
        );
    }

    public List<SectorSummaryDto> listSectors() {
        User current = requireCurrentUser();
        return sectorRepository.findAllByOrderByNameAsc().stream()
                .filter(s -> canAccessSector(current, s.getId()))
                .map(this::toSectorSummary)
                .toList();
    }

    public SectorDetailDto getSector(Long sectorId) {
        User current = requireCurrentUser();
        Sector sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sector not found"));
        assertCanAccessSector(current, sector.getId());

        List<DepartmentSummaryDto> departments = departmentRepository
                .findBySectorIdOrderByNameAsc(sectorId)
                .stream()
                .filter(d -> canAccessDepartment(current, d))
                .map(this::toDepartmentSummary)
                .toList();

        SectorSummaryDto summary = toSectorSummary(sector);
        return new SectorDetailDto(
                summary.id(),
                summary.code(),
                summary.name(),
                summary.description(),
                summary.active(),
                summary.departmentCount(),
                summary.tenderCount(),
                summary.activeTenderCount(),
                summary.completedTenderCount(),
                departments
        );
    }

    public List<DepartmentSummaryDto> listDepartmentsForSector(Long sectorId) {
        User current = requireCurrentUser();
        if (!sectorRepository.existsById(sectorId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sector not found");
        }
        assertCanAccessSector(current, sectorId);
        return departmentRepository.findBySectorIdOrderByNameAsc(sectorId).stream()
                .filter(d -> canAccessDepartment(current, d))
                .map(this::toDepartmentSummary)
                .toList();
    }

    public DepartmentDetailDto getDepartment(Long departmentId) {
        User current = requireCurrentUser();
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        assertCanAccessDepartment(current, department);

        List<OfficerSummaryDto> officers = userRepository
                .findByDepartmentIdAndRoleContainingIgnoreCase(departmentId, "OFFICER")
                .stream()
                .map(u -> new OfficerSummaryDto(
                        u.getId(), u.getName(), u.getEmail(),
                        u.getDesignation(), u.getOfficerId(), u.getRole()))
                .toList();

        // Also include users with GOVERNMENT OFFICER role if roleContaining misspaced
        if (officers.isEmpty()) {
            officers = userRepository.findAll().stream()
                    .filter(u -> departmentId.equals(u.getDepartmentId()))
                    .filter(u -> normalizeRole(u.getRole()).contains("OFFICER")
                            || "CENTRAL_ADMIN".equals(normalizeRole(u.getRole()))
                            || "SECTOR_USER".equals(normalizeRole(u.getRole())))
                    .map(u -> new OfficerSummaryDto(
                            u.getId(), u.getName(), u.getEmail(),
                            u.getDesignation(), u.getOfficerId(), u.getRole()))
                    .toList();
        }

        List<TenderListItemDto> tenders = tenderRepository
                .findByDepartmentIdOrderByCreatedAtDesc(departmentId)
                .stream()
                .map(this::toTenderListItem)
                .toList();

        DepartmentSummaryDto summary = toDepartmentSummary(department);
        return new DepartmentDetailDto(
                summary.id(),
                summary.sectorId(),
                summary.sectorCode(),
                summary.sectorName(),
                summary.code(),
                summary.name(),
                summary.description(),
                summary.active(),
                summary.tenderCount(),
                summary.activeTenderCount(),
                summary.completedTenderCount(),
                officers,
                tenders
        );
    }

    public List<TenderListItemDto> listTendersForDepartment(Long departmentId) {
        User current = requireCurrentUser();
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
        assertCanAccessDepartment(current, department);
        return tenderRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId).stream()
                .map(this::toTenderListItem)
                .toList();
    }

    public List<TenderListItemDto> listTenders(Long sectorId, Long departmentId) {
        User current = requireCurrentUser();
        List<Tender> tenders;
        if (departmentId != null) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found"));
            assertCanAccessDepartment(current, department);
            tenders = tenderRepository.findByDepartmentIdOrderByCreatedAtDesc(departmentId);
        } else if (sectorId != null) {
            assertCanAccessSector(current, sectorId);
            tenders = tenderRepository.findByDepartment_Sector_IdOrderByCreatedAtDesc(sectorId);
        } else {
            tenders = resolveAccessibleTenders(current);
        }
        return tenders.stream().map(this::toTenderListItem).toList();
    }

    public TenderListItemDto getTender(String tenderId) {
        User current = requireCurrentUser();
        Tender tender = tenderRepository.findByTenderId(tenderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tender not found"));
        assertCanAccessDepartment(current, tender.getDepartment());
        return toTenderListItem(tender);
    }

    private SectorSummaryDto toSectorSummary(Sector sector) {
        long departmentCount = departmentRepository.countBySectorId(sector.getId());
        long tenderCount = tenderRepository.countByDepartment_Sector_Id(sector.getId());
        long active = tenderRepository.countByDepartment_Sector_IdAndStatusIgnoreCase(sector.getId(), "ACTIVE");
        long completed = tenderRepository.countByDepartment_Sector_IdAndStatusIgnoreCase(sector.getId(), "COMPLETED");
        // Also count CLOSED as completed for display
        completed += tenderRepository.countByDepartment_Sector_IdAndStatusIgnoreCase(sector.getId(), "CLOSED");
        return new SectorSummaryDto(
                sector.getId(),
                sector.getCode(),
                sector.getName(),
                sector.getDescription(),
                sector.getActive(),
                departmentCount,
                tenderCount,
                active,
                completed
        );
    }

    private DepartmentSummaryDto toDepartmentSummary(Department department) {
        Long sectorId = department.getSector() != null ? department.getSector().getId() : null;
        String sectorCode = department.getSector() != null ? department.getSector().getCode() : null;
        String sectorName = department.getSector() != null ? department.getSector().getName() : null;
        long tenderCount = tenderRepository.countByDepartmentId(department.getId());
        long active = tenderRepository.countByDepartmentIdAndStatusIgnoreCase(department.getId(), "ACTIVE");
        long completed = tenderRepository.countByDepartmentIdAndStatusIgnoreCase(department.getId(), "COMPLETED")
                + tenderRepository.countByDepartmentIdAndStatusIgnoreCase(department.getId(), "CLOSED");
        long officerCount = userRepository.findAll().stream()
                .filter(u -> department.getId().equals(u.getDepartmentId()))
                .count();
        return new DepartmentSummaryDto(
                department.getId(),
                sectorId,
                sectorCode,
                sectorName,
                department.getCode(),
                department.getName(),
                department.getDescription(),
                department.getActive(),
                tenderCount,
                active,
                completed,
                officerCount
        );
    }

    private TenderListItemDto toTenderListItem(Tender tender) {
        Department department = tender.getDepartment();
        Sector sector = department != null ? department.getSector() : null;
        long bidderCount = bidRepository.countByTenderId(tender.getTenderId());
        List<Bid> bids = bidRepository.findByTenderIdOrderByCreatedAtDesc(tender.getTenderId());
        String complianceStatus = null;
        String primaryBidId = null;
        if (!bids.isEmpty()) {
            Bid primary = bids.get(0);
            primaryBidId = primary.getBidId();
            complianceStatus = primary.getStatus();
        }
        return new TenderListItemDto(
                tender.getId(),
                tender.getTenderId(),
                tender.getTitle(),
                tender.getStatus(),
                tender.getCategory(),
                tender.getTenderDate(),
                tender.getClosingDate(),
                department != null ? department.getId() : null,
                department != null ? department.getName() : null,
                sector != null ? sector.getId() : null,
                sector != null ? sector.getName() : null,
                tender.getAssignedOfficerId(),
                tender.getAssignedOfficerName(),
                bidderCount,
                complianceStatus,
                primaryBidId
        );
    }

    private List<Tender> resolveAccessibleTenders(User current) {
        String role = normalizeRole(current.getRole());
        if (isCentralAdmin(role) || isGovernmentOfficerUnscoped(current, role)) {
            return tenderRepository.findAllByOrderByCreatedAtDesc();
        }
        if ("SECTOR_USER".equals(role) && current.getSectorId() != null) {
            return tenderRepository.findByDepartment_Sector_IdOrderByCreatedAtDesc(current.getSectorId());
        }
        if (current.getDepartmentId() != null) {
            return tenderRepository.findByDepartmentIdOrderByCreatedAtDesc(current.getDepartmentId());
        }
        if (current.getSectorId() != null) {
            return tenderRepository.findByDepartment_Sector_IdOrderByCreatedAtDesc(current.getSectorId());
        }
        return new ArrayList<>();
    }

    private User requireCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return userRepository.findByEmail(auth.getName())
                .or(() -> userRepository.findByEmail(auth.getName().toLowerCase(Locale.ROOT)))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }

    private void assertCanViewCentral(User user) {
        String role = normalizeRole(user.getRole());
        if (isCentralAdmin(role) || "SECTOR_USER".equals(role) || isOfficerRole(role)) {
            return;
        }
        throw new AccessDeniedException("Not authorized to view government hierarchy overview");
    }

    private boolean canAccessSector(User user, Long sectorId) {
        String role = normalizeRole(user.getRole());
        if (isCentralAdmin(role)) return true;
        if (isOfficerRole(role) && user.getSectorId() == null && user.getDepartmentId() == null) {
            // Legacy unscoped officers retain read access to hierarchy (demo continuity).
            return true;
        }
        if ("SECTOR_USER".equals(role)) {
            return sectorId != null && sectorId.equals(user.getSectorId());
        }
        if (isOfficerRole(role)) {
            if (user.getSectorId() != null) return sectorId.equals(user.getSectorId());
            if (user.getDepartmentId() != null) {
                Optional<Department> dept = departmentRepository.findById(user.getDepartmentId());
                return dept.isPresent() && sectorId.equals(dept.get().getSector().getId());
            }
        }
        return false;
    }

    private void assertCanAccessSector(User user, Long sectorId) {
        if (!canAccessSector(user, sectorId)) {
            throw new AccessDeniedException("Not authorized to access this sector");
        }
    }

    private boolean canAccessDepartment(User user, Department department) {
        if (department == null || department.getSector() == null) return false;
        String role = normalizeRole(user.getRole());
        if (isCentralAdmin(role)) return true;
        if (isOfficerRole(role) && user.getSectorId() == null && user.getDepartmentId() == null) {
            return true;
        }
        if ("SECTOR_USER".equals(role)) {
            return department.getSector().getId().equals(user.getSectorId());
        }
        if (isOfficerRole(role)) {
            if (user.getDepartmentId() != null) {
                return department.getId().equals(user.getDepartmentId());
            }
            if (user.getSectorId() != null) {
                return department.getSector().getId().equals(user.getSectorId());
            }
        }
        return false;
    }

    private void assertCanAccessDepartment(User user, Department department) {
        if (!canAccessDepartment(user, department)) {
            throw new AccessDeniedException("Not authorized to access this department");
        }
    }

    private boolean isGovernmentOfficerUnscoped(User user, String role) {
        return isOfficerRole(role) && user.getSectorId() == null && user.getDepartmentId() == null;
    }

    private static boolean isCentralAdmin(String role) {
        return "CENTRAL_ADMIN".equals(role) || "ADMIN".equals(role) || "GOVERNMENT_ADMIN".equals(role);
    }

    private static boolean isOfficerRole(String role) {
        return "GOVERNMENT_OFFICER".equals(role)
                || "GOVT_OFFICER".equals(role)
                || "OFFICER".equals(role);
    }

    private static String normalizeRole(String role) {
        if (role == null) return "";
        return role.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
    }
}
