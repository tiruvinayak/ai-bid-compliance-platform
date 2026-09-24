package com.sih.gem.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HierarchyEntityTest {

    @Test
    void sectorDepartmentTenderRelationshipDefaultsAreSafe() {
        Sector sector = Sector.builder()
                .code("RAILWAYS")
                .name("Railways")
                .description("DEMO")
                .build();
        sector.prePersist();

        Department department = Department.builder()
                .sector(sector)
                .code("RPD")
                .name("Railway Procurement Department")
                .description("DEMO")
                .build();
        department.prePersist();

        Tender tender = Tender.builder()
                .tenderId("TND-TEST-001")
                .title("Test Tender")
                .department(department)
                .build();
        tender.prePersist();

        assertTrue(Boolean.TRUE.equals(sector.getActive()));
        assertTrue(Boolean.TRUE.equals(department.getActive()));
        assertEquals("ACTIVE", tender.getStatus());
        assertNotNull(sector.getCreatedAt());
        assertNotNull(department.getCreatedAt());
        assertEquals(sector, department.getSector());
        assertEquals(department, tender.getDepartment());
    }
}
