package com.sih.gem.controller;

import com.sih.gem.dto.AuthDtos.*;
import com.sih.gem.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/register/bidder")
    public ResponseEntity<AuthResponse> registerBidder(@Valid @RequestBody BidderRegisterRequest request) {
        return ResponseEntity.ok(authService.registerBidder(request));
    }

    @PostMapping("/register/officer")
    public ResponseEntity<AuthResponse> registerOfficer(@Valid @RequestBody OfficerRegisterRequest request) {
        return ResponseEntity.ok(authService.registerOfficer(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(Authentication authentication) {
        return ResponseEntity.ok(authService.getCurrentUser(authentication.getName()));
    }
}
