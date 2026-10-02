package com.sih.gem.service;

import com.sih.gem.dto.AuthDtos.*;
import com.sih.gem.entity.User;
import com.sih.gem.repository.UserRepository;
import com.sih.gem.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEffectiveUsername();
        if (email.isBlank()) {
            throw new RuntimeException("Email or Username is required");
        }
        log.info("Authentication request received for user '{}'", email);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (RuntimeException ex) {
            log.warn("Authentication failed for user '{}': {}", email, ex.getClass().getSimpleName());
            throw ex;
        }

        User user = userRepository.findByEmail(email)
                .or(() -> userRepository.findByEmail(email.toLowerCase()))
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        log.info("Authentication succeeded for user '{}' with role {}", email, user.getRole());
        return new AuthResponse(token, toDto(user));
    }

    public AuthResponse registerBidder(BidderRegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("Email address '" + request.email() + "' is already registered. Please use another email address.");
        }
        if (request.mobile() != null && !request.mobile().isBlank() && userRepository.existsByMobile(request.mobile())) {
            throw new RuntimeException("Mobile number '" + request.mobile() + "' is already registered.");
        }
        if (request.gstin() != null && !request.gstin().isBlank() && userRepository.existsByGstin(request.gstin())) {
            throw new RuntimeException("GSTIN '" + request.gstin() + "' is already registered.");
        }
        if (request.registrationNo() != null && !request.registrationNo().isBlank() && userRepository.existsByRegistrationNo(request.registrationNo())) {
            throw new RuntimeException("Company registration number (CIN) '" + request.registrationNo() + "' is already registered.");
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .organization(request.organization())
                .mobile(request.mobile())
                .gstin(request.gstin())
                .registrationNo(request.registrationNo())
                .designation("Authorized Bidder Representative")
                .department(request.organization() != null ? request.organization() : "Bidder Organization")
                .role("USER")
                .accountStatus("Active")
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new AuthResponse(token, toDto(user));
    }

    public AuthResponse registerOfficer(OfficerRegisterRequest request) {
        throw new AccessDeniedException("Government officer accounts must be provisioned by an authorized administrator.");
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("Email address '" + request.email() + "' is already registered. Please use another email address.");
        }

        // Generic self-registration is intentionally bidder-only. A role supplied by
        // the client is never treated as an authorization decision.
        String role = "USER";

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .designation(request.designation())
                .department(request.department())
                .organization(request.organization())
                .mobile(request.mobile())
                .officerId(request.officerId())
                .gstin(request.gstin())
                .registrationNo(request.registrationNo())
                .role(role)
                .accountStatus("Active")
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new AuthResponse(token, toDto(user));
    }

    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getDesignation(),
                user.getDepartment(),
                user.getOrganization(),
                user.getMobile(),
                user.getOfficerId(),
                user.getGstin(),
                user.getRegistrationNo(),
                user.getEmail(),
                user.getRole(),
                user.getAccountStatus(),
                user.getLastLogin() == null ? null : user.getLastLogin().toString(),
                user.getSectorId(),
                user.getDepartmentId()
        );
    }
}
