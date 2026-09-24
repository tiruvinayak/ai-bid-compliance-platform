package com.sih.gem.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDtos {

    public record LoginRequest(
            String username,
            String email,
            @NotBlank String password
    ) {
        public String getEffectiveUsername() {
            if (username != null && !username.isBlank()) return username.trim();
            if (email != null && !email.isBlank()) return email.trim();
            return "";
        }
    }

    public record BidderRegisterRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotBlank String name,
            String organization,
            String mobile,
            String gstin,
            String registrationNo
    ) {}

    public record OfficerRegisterRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotBlank String name,
            @NotBlank String officerId,
            @NotBlank String department,
            String designation,
            String mobile
    ) {}

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotBlank String name,
            String designation,
            String department,
            String organization,
            String mobile,
            String officerId,
            String gstin,
            String registrationNo,
            @NotBlank String role
    ) {}

    public record AuthResponse(
            String token,
            UserDto user
    ) {}

    public record UserDto(
            Long id,
            String name,
            String designation,
            String department,
            String organization,
            String mobile,
            String officerId,
            String gstin,
            String registrationNo,
            String email,
            String role,
            String accountStatus,
            String lastLogin,
            Long sectorId,
            Long departmentId
    ) {}
}
