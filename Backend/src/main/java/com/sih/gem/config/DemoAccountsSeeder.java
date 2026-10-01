package com.sih.gem.config;

import com.sih.gem.entity.Department;
import com.sih.gem.entity.Sector;
import com.sih.gem.entity.User;
import com.sih.gem.repository.DepartmentRepository;
import com.sih.gem.repository.SectorRepository;
import com.sih.gem.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

/**
 * Fixed SIH demo credentials, seeded idempotently at application startup.
 *
 * Runs after the hierarchy seed (@Order 100) so sectors and departments
 * already exist. Each account is create-if-missing only: existing rows are
 * never modified or deleted, so restarting or upgrading an existing database
 * never creates duplicates or overwrites operator data.
 *
 * Accounts (evaluation credentials):
 *   admin@demo.gov.in    / Admin@123    -> CENTRAL_ADMIN
 *   railways@demo.gov.in / Sector@123   -> SECTOR_USER (RAILWAYS)
 *   officer@demo.gov.in  / Officer@123  -> GOVT_OFFICER (RAILWAYS / RPD)
 *   user@demo.gov.in     / User@123     -> USER (bidder console)
 *
 * Role strings are the project's existing internal names: the bidder console
 * is stored as USER (frontend normalizes and labels it "BIDDER APPLICANT"),
 * and GOVT_OFFICER is accepted by backend @PreAuthorize rules and normalized
 * to "GOVERNMENT OFFICER" by the frontend.
 */
@Configuration
public class DemoAccountsSeeder {

    @Bean
    @Order(150)
    CommandLineRunner seedDemoAccounts(UserRepository userRepository,
                                       SectorRepository sectorRepository,
                                       DepartmentRepository departmentRepository,
                                       PasswordEncoder passwordEncoder) {
        return args -> {
            Sector railways = sectorRepository.findByCodeIgnoreCase("RAILWAYS").orElse(null);
            Department railwayProcurement = railways != null
                    ? departmentRepository.findBySectorIdAndCodeIgnoreCase(railways.getId(), "RPD").orElse(null)
                    : null;

            // Central Government Admin — never publicly registerable; seeded only.
            if (userRepository.findByEmail("admin@demo.gov.in").isEmpty()) {
                userRepository.save(User.builder()
                        .email("admin@demo.gov.in")
                        .password(passwordEncoder.encode("Admin@123"))
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

            // Sector-level console scoped to Railways.
            if (userRepository.findByEmail("railways@demo.gov.in").isEmpty()) {
                userRepository.save(User.builder()
                        .email("railways@demo.gov.in")
                        .password(passwordEncoder.encode("Sector@123"))
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

            // Government review officer — provisioning stays admin-only at runtime.
            if (userRepository.findByEmail("officer@demo.gov.in").isEmpty()) {
                userRepository.save(User.builder()
                        .email("officer@demo.gov.in")
                        .password(passwordEncoder.encode("Officer@123"))
                        .name("Rajesh V. Sharma")
                        .designation("Senior Procurement Officer")
                        .department(railwayProcurement != null
                                ? railwayProcurement.getName() : "Railway Procurement Department (DEMO)")
                        .organization("Railways DEMO Sector Console")
                        .officerId("OFF-RPD-DEMO-001")
                        .role("GOVT_OFFICER")
                        .sectorId(railways != null ? railways.getId() : null)
                        .departmentId(railwayProcurement != null ? railwayProcurement.getId() : null)
                        .accountStatus("Active")
                        .createdAt(LocalDateTime.now())
                        .build());
            }

            // Bidder / applicant console (internal role name: USER).
            if (userRepository.findByEmail("user@demo.gov.in").isEmpty()) {
                userRepository.save(User.builder()
                        .email("user@demo.gov.in")
                        .password(passwordEncoder.encode("User@123"))
                        .name("Sathvik Reddy")
                        .designation("Authorized Bidder Representative")
                        .department("Acme Infra Pvt Ltd")
                        .organization("Acme Infra Pvt Ltd")
                        .registrationNo("REG-8891")
                        .role("USER")
                        .accountStatus("Active")
                        .createdAt(LocalDateTime.now())
                        .build());
            }
        };
    }
}
