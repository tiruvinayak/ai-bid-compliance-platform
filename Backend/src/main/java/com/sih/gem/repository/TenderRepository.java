package com.sih.gem.repository;

import com.sih.gem.entity.Tender;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenderRepository extends JpaRepository<Tender, Long> {
    Optional<Tender> findByTenderId(String tenderId);
    boolean existsByTenderId(String tenderId);

    List<Tender> findByDepartmentIdOrderByCreatedAtDesc(Long departmentId);
    List<Tender> findByDepartment_Sector_IdOrderByCreatedAtDesc(Long sectorId);
    List<Tender> findAllByOrderByCreatedAtDesc();

    long countByDepartmentId(Long departmentId);
    long countByDepartment_Sector_Id(Long sectorId);
    long countByDepartment_Sector_IdAndStatusIgnoreCase(Long sectorId, String status);
    long countByDepartmentIdAndStatusIgnoreCase(Long departmentId, String status);
    long countByStatusIgnoreCase(String status);

    List<Tender> findByAssignedOfficerIdOrderByCreatedAtDesc(Long assignedOfficerId);
}
