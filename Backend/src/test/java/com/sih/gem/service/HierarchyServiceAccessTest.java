package com.sih.gem.service;

import com.sih.gem.entity.Department;
import com.sih.gem.entity.Sector;
import com.sih.gem.entity.Tender;
import com.sih.gem.entity.User;
import com.sih.gem.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Hierarchy authorization for Phase 4 comparison access:
 * officer stays inside their department/sector; bidders are denied entirely.
 */
class HierarchyServiceAccessTest {

    private final SectorRepository sectors = mock(SectorRepository.class);
    private final DepartmentRepository departments = mock(DepartmentRepository.class);
    private final TenderRepository tenders = mock(TenderRepository.class);
    private final BidRepository bids = mock(BidRepository.class);
    private final UserRepository users = mock(UserRepository.class);

    private final HierarchyService service =
            new HierarchyService(sectors, departments, tenders, bids, users);

    private final Sector railways = Sector.builder().id(1L).code("RAILWAYS").name("Railways").build();
    private final Sector finance = Sector.builder().id(2L).code("FINANCE").name("Finance").build();
    private final Department rpd = Department.builder().id(10L).code("RPD")
            .name("Railway Procurement Department").sector(railways).build();
    private final Department fsd = Department.builder().id(30L).code("FSD")
            .name("Financial Services Department").sector(finance).build();

    @BeforeEach
    void setUp() {
        Tender railTender = Tender.builder().id(1L).tenderId("TND-GEM-2026-1042")
                .title("Network Infrastructure").department(rpd).status("ACTIVE").build();
        Tender finTender = Tender.builder().id(2L).tenderId("TND-FIN-2026-3101")
                .title("Financial audit services").department(fsd).status("ACTIVE").build();
        when(tenders.findByTenderId("TND-GEM-2026-1042")).thenReturn(Optional.of(railTender));
        when(tenders.findByTenderId("TND-FIN-2026-3101")).thenReturn(Optional.of(finTender));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(String email, List<String> authorities) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(email, "n/a",
                        authorities.stream().map(SimpleGrantedAuthority::new).toList()));
    }

    // Test 4 — scoped officer cannot compare another department's tender.
    @Test
    void officerCannotAccessAnotherDepartmentTender() {
        authenticate("officer@demo.gov.in", List.of("ROLE_GOVERNMENT_OFFICER"));
        when(users.findByEmail("officer@demo.gov.in")).thenReturn(Optional.of(
                User.builder().email("officer@demo.gov.in").role("GOVERNMENT OFFICER")
                        .sectorId(1L).departmentId(10L).build()));

        assertDoesNotThrow(() -> service.requireAccessibleTender("TND-GEM-2026-1042"));
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requireAccessibleTender("TND-FIN-2026-3101"));
        assertTrue(ex.getMessage().contains("department"));
    }

    // Sector user is scoped to their own sector only.
    @Test
    void sectorUserCannotAccessForeignSectorTender() {
        authenticate("railways@demo.gov.in", List.of("ROLE_SECTOR_USER"));
        when(users.findByEmail("railways@demo.gov.in")).thenReturn(Optional.of(
                User.builder().email("railways@demo.gov.in").role("SECTOR_USER")
                        .sectorId(1L).build()));

        assertDoesNotThrow(() -> service.requireAccessibleTender("TND-GEM-2026-1042"));
        assertThrows(AccessDeniedException.class,
                () -> service.requireAccessibleTender("TND-FIN-2026-3101"));
    }

    // Central admin sees everything.
    @Test
    void centralAdminCanAccessAnyTender() {
        authenticate("admin@demo.gov.in", List.of("ROLE_CENTRAL_ADMIN"));
        when(users.findByEmail("admin@demo.gov.in")).thenReturn(Optional.of(
                User.builder().email("admin@demo.gov.in").role("CENTRAL_ADMIN").build()));

        assertDoesNotThrow(() -> service.requireAccessibleTender("TND-GEM-2026-1042"));
        assertDoesNotThrow(() -> service.requireAccessibleTender("TND-FIN-2026-3101"));
    }

    // A bidder is denied even if they somehow reach the service layer.
    @Test
    void bidderIsDeniedAtServiceLayer() {
        authenticate("user@demo.gov.in", List.of("ROLE_USER"));
        when(users.findByEmail("user@demo.gov.in")).thenReturn(Optional.of(
                User.builder().email("user@demo.gov.in").role("USER")
                        .department("ABC Technologies Pvt Ltd").build()));

        assertThrows(AccessDeniedException.class,
                () -> service.requireAccessibleTender("TND-GEM-2026-1042"));
    }
}
