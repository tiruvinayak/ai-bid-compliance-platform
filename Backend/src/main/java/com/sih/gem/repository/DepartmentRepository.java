package com.sih.gem.repository;

import com.sih.gem.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findBySectorIdAndActiveTrueOrderByNameAsc(Long sectorId);
    List<Department> findBySectorIdOrderByNameAsc(Long sectorId);
    Optional<Department> findBySectorIdAndCodeIgnoreCase(Long sectorId, String code);
    Optional<Department> findByNameIgnoreCase(String name);
    long countBySectorId(Long sectorId);
    long countBySectorIdAndActiveTrue(Long sectorId);
}
