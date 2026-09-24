package com.sih.gem.config;

import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Idempotent government hierarchy seed (sectors → departments → demo tenders).
 * Safe to run on existing databases: only inserts when the hierarchy is empty
 * or when specific demo users/tenders are missing.
 */
@Configuration
public class HierarchyDataSeeder {

    @Bean
    @Order(100)
    CommandLineRunner seedGovernmentHierarchy(SectorRepository sectorRepository,
                                              DepartmentRepository departmentRepository,
                                              TenderRepository tenderRepository,
                                              BidRepository bidRepository,
                                              UserRepository userRepository,
                                              PasswordEncoder passwordEncoder) {
        return args -> {
            Map<String, Sector> sectors = ensureSectors(sectorRepository);
            Map<String, Department> departments = ensureDepartments(departmentRepository, sectors);
            ensureDemoUsers(userRepository, passwordEncoder, sectors, departments);
            ensureDemoTenders(tenderRepository, bidRepository, departments, userRepository);
        };
    }

    private Map<String, Sector> ensureSectors(SectorRepository repo) {
        Map<String, Sector> byCode = new LinkedHashMap<>();
        List<SectorSpec> specs = List.of(
                new SectorSpec("RAILWAYS", "Railways",
                        "DEMO sector for railway procurement oversight (sample data for SIH26100)."),
                new SectorSpec("FINANCE", "Finance",
                        "DEMO sector for government finance procurement oversight (sample data)."),
                new SectorSpec("DEFENCE", "Defence",
                        "DEMO sector for defence procurement oversight (sample data)."),
                new SectorSpec("PETROLEUM_ENERGY", "Petroleum & Energy",
                        "DEMO sector for petroleum and energy procurement oversight (sample data).")
        );

        for (SectorSpec spec : specs) {
            Sector sector = repo.findByCodeIgnoreCase(spec.code()).orElseGet(() ->
                    repo.save(Sector.builder()
                            .code(spec.code())
                            .name(spec.name())
                            .description(spec.description())
                            .active(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build()));
            byCode.put(spec.code(), sector);
        }
        return byCode;
    }

    private Map<String, Department> ensureDepartments(DepartmentRepository repo, Map<String, Sector> sectors) {
        Map<String, Department> byKey = new LinkedHashMap<>();
        List<DeptSpec> specs = List.of(
                new DeptSpec("RAILWAYS", "RPD", "Railway Procurement Department",
                        "DEMO department — sample structure only, not an official org chart."),
                new DeptSpec("RAILWAYS", "RID", "Railway Infrastructure Department",
                        "DEMO department — sample structure only."),
                new DeptSpec("FINANCE", "FSD", "Financial Services Department",
                        "DEMO department — sample structure only."),
                new DeptSpec("FINANCE", "GFPD", "Government Finance Procurement Department",
                        "DEMO department — sample structure only."),
                new DeptSpec("DEFENCE", "DPD", "Defence Procurement Department",
                        "DEMO department — sample structure only."),
                new DeptSpec("DEFENCE", "DTPD", "Defence Technology Procurement Department",
                        "DEMO department — sample structure only."),
                new DeptSpec("PETROLEUM_ENERGY", "PPD", "Petroleum Procurement Department",
                        "DEMO department — sample structure only."),
                new DeptSpec("PETROLEUM_ENERGY", "EIPD", "Energy Infrastructure Procurement Department",
                        "DEMO department — sample structure only.")
        );

        for (DeptSpec spec : specs) {
            Sector sector = sectors.get(spec.sectorCode());
            String key = spec.sectorCode() + ":" + spec.code();
            Department department = repo.findBySectorIdAndCodeIgnoreCase(sector.getId(), spec.code())
                    .orElseGet(() -> repo.save(Department.builder()
                            .sector(sector)
                            .code(spec.code())
                            .name(spec.name())
                            .description(spec.description())
                            .active(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build()));
            byKey.put(key, department);
        }
        return byKey;
    }

    private void ensureDemoUsers(UserRepository repo,
                                 PasswordEncoder encoder,
                                 Map<String, Sector> sectors,
                                 Map<String, Department> departments) {
        Department railwayProcurement = departments.get("RAILWAYS:RPD");
        Sector railways = sectors.get("RAILWAYS");

        // Central Government Admin — no public registration; seeded only.
        if (repo.findByEmail("admin@demo.gov.in").isEmpty()) {
            repo.save(User.builder()
                    .email("admin@demo.gov.in")
                    .password(encoder.encode("Admin@123"))
                    .name("Central Government Admin (DEMO)")
                    .designation("Central Procurement Oversight Administrator")
                    .department("Central Government (DEMO)")
                    .organization("Central Government Demo Console")
                    .officerId("CG-ADMIN-DEMO-001")
                    .role("CENTRAL_ADMIN")
                    .accountStatus("Active")
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        // Sector-level user scoped to Railways (DEMO).
        if (repo.findByEmail("railways@demo.gov.in").isEmpty()) {
            repo.save(User.builder()
                    .email("railways@demo.gov.in")
                    .password(encoder.encode("Sector@123"))
                    .name("Railways Sector Officer (DEMO)")
                    .designation("Sector Procurement Coordinator")
                    .department("Railways Sector (DEMO)")
                    .organization("Railways DEMO Sector Console")
                    .officerId("SEC-RAIL-DEMO-001")
                    .role("SECTOR_USER")
                    .sectorId(railways != null ? railways.getId() : null)
                    .accountStatus("Active")
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        // Link existing demo officer to Railway Procurement Department when present.
        repo.findByEmail("officer@demo.gov.in").ifPresent(officer -> {
            boolean changed = false;
            if (officer.getDepartmentId() == null && railwayProcurement != null) {
                officer.setDepartmentId(railwayProcurement.getId());
                officer.setSectorId(railways != null ? railways.getId() : null);
                officer.setDepartment(railwayProcurement.getName());
                officer.setOfficerId(officer.getOfficerId() == null ? "OFF-RPD-DEMO-001" : officer.getOfficerId());
                changed = true;
            }
            if (changed) repo.save(officer);
        });
    }

    private void ensureDemoTenders(TenderRepository tenderRepository,
                                   BidRepository bidRepository,
                                   Map<String, Department> departments,
                                   UserRepository userRepository) {
        User officer = userRepository.findByEmail("officer@demo.gov.in").orElse(null);
        Long officerId = officer != null ? officer.getId() : null;
        String officerName = officer != null ? officer.getName() : "Rajesh V. Sharma";

        upsertTender(tenderRepository, "TND-GEM-2026-1042",
                "Supply and Installation of Network Infrastructure",
                departments.get("RAILWAYS:RPD"),
                "IT & Networking", "2026-08-01", "2026-09-15", "ACTIVE",
                officerId, officerName);

        upsertTender(tenderRepository, "TND-RAIL-2026-2101",
                "DEMO: Railway Signalling Spare Parts Procurement",
                departments.get("RAILWAYS:RID"),
                "Infrastructure", "2026-07-15", "2026-10-01", "ACTIVE",
                officerId, officerName);

        upsertTender(tenderRepository, "TND-FIN-2026-3101",
                "DEMO: Financial Systems Audit Support Services",
                departments.get("FINANCE:FSD"),
                "Professional Services", "2026-06-01", "2026-08-30", "COMPLETED",
                null, null);

        upsertTender(tenderRepository, "TND-FIN-2026-3102",
                "DEMO: Treasury Digitization Hardware Supply",
                departments.get("FINANCE:GFPD"),
                "IT Hardware", "2026-08-10", "2026-11-15", "ACTIVE",
                null, null);

        upsertTender(tenderRepository, "TND-DEF-2026-4101",
                "DEMO: Defence Communication Equipment Supply",
                departments.get("DEFENCE:DPD"),
                "Communication", "2026-05-20", "2026-09-01", "ACTIVE",
                null, null);

        upsertTender(tenderRepository, "TND-DEF-2026-4102",
                "DEMO: Defence Lab Instrumentation (Completed Sample)",
                departments.get("DEFENCE:DTPD"),
                "Technology", "2026-01-10", "2026-04-30", "COMPLETED",
                null, null);

        upsertTender(tenderRepository, "TND-PE-2026-5101",
                "DEMO: Petroleum Pipeline Monitoring Sensors",
                departments.get("PETROLEUM_ENERGY:PPD"),
                "Sensors & IoT", "2026-07-01", "2026-10-20", "ACTIVE",
                null, null);

        upsertTender(tenderRepository, "TND-PE-2026-5102",
                "DEMO: Energy Grid Substation Upgrade",
                departments.get("PETROLEUM_ENERGY:EIPD"),
                "Energy Infrastructure", "2026-03-01", "2026-06-15", "COMPLETED",
                null, null);

        // Align existing sample bid department label with hierarchy department name.
        bidRepository.findByBidId("GEM-2026-001").ifPresent(bid -> {
            Department rpd = departments.get("RAILWAYS:RPD");
            if (rpd != null && (bid.getDepartment() == null
                    || bid.getDepartment().contains("Electronics")
                    || bid.getDepartment().contains("MeitY"))) {
                bid.setDepartment(rpd.getName());
                if (bid.getTenderId() == null || bid.getTenderId().isBlank()) {
                    bid.setTenderId("TND-GEM-2026-1042");
                }
                bidRepository.save(bid);
            }
        });
    }

    private void upsertTender(TenderRepository repo,
                              String tenderId,
                              String title,
                              Department department,
                              String category,
                              String tenderDate,
                              String closingDate,
                              String status,
                              Long assignedOfficerId,
                              String assignedOfficerName) {
        if (department == null) return;
        if (repo.existsByTenderId(tenderId)) return;
        repo.save(Tender.builder()
                .tenderId(tenderId)
                .title(title)
                .department(department)
                .category(category)
                .tenderDate(tenderDate)
                .closingDate(closingDate)
                .status(status)
                .assignedOfficerId(assignedOfficerId)
                .assignedOfficerName(assignedOfficerName)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private record SectorSpec(String code, String name, String description) {}
    private record DeptSpec(String sectorCode, String code, String name, String description) {}
}
