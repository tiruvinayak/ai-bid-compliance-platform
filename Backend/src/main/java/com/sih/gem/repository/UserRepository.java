package com.sih.gem.repository;

import com.sih.gem.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByMobile(String mobile);
    boolean existsByGstin(String gstin);
    boolean existsByRegistrationNo(String registrationNo);
    List<User> findByDepartmentIdAndRoleContainingIgnoreCase(Long departmentId, String role);
    List<User> findBySectorId(Long sectorId);
}
