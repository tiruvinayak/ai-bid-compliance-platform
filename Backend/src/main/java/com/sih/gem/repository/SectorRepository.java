package com.sih.gem.repository;

import com.sih.gem.entity.Sector;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectorRepository extends JpaRepository<Sector, Long> {
    Optional<Sector> findByCodeIgnoreCase(String code);
    List<Sector> findAllByActiveTrueOrderByNameAsc();
    List<Sector> findAllByOrderByNameAsc();
    boolean existsByCodeIgnoreCase(String code);
}
