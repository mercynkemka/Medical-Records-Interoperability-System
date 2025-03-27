import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockPatients = new Map();
let mockBlockHeight = 100;
let mockBlockTime = 1625097600; // Example timestamp
let mockTxSender = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
let mockAdmin = mockTxSender;

// Mock contract functions
const patientIdentityContract = {
  // Data variables
  admin: mockAdmin,
  
  // Maps
  patients: mockPatients,
  
  // Helper functions to simulate Clarity behavior
  'get-block-info?': (key, height) => {
    if (key === 'time') {
      return { type: 'some', value: mockBlockTime };
    }
    return { type: 'none' };
  },
  
  // Contract functions
  'register-patient': (patientId, metadataHash) => {
    const patientKey = JSON.stringify({ 'patient-id': patientId });
    
    if (mockPatients.has(patientKey)) {
      return { type: 'err', value: 1001 };
    }
    
    mockPatients.set(patientKey, {
      owner: mockTxSender,
      'metadata-hash': metadataHash,
      active: true,
      'created-at': mockBlockTime,
      'updated-at': mockBlockTime
    });
    
    return { type: 'ok', value: true };
  },
  
  'update-patient-metadata': (patientId, metadataHash) => {
    const patientKey = JSON.stringify({ 'patient-id': patientId });
    
    if (!mockPatients.has(patientKey)) {
      return { type: 'err', value: 1002 };
    }
    
    const patientData = mockPatients.get(patientKey);
    
    if (patientData.owner !== mockTxSender) {
      return { type: 'err', value: 1003 };
    }
    
    patientData['metadata-hash'] = metadataHash;
    patientData['updated-at'] = mockBlockTime;
    mockPatients.set(patientKey, patientData);
    
    return { type: 'ok', value: true };
  },
  
  'get-patient': (patientId) => {
    const patientKey = JSON.stringify({ 'patient-id': patientId });
    
    if (!mockPatients.has(patientKey)) {
      return { type: 'none' };
    }
    
    return { type: 'some', value: mockPatients.get(patientKey) };
  },
  
  'is-patient-active': (patientId) => {
    const patientKey = JSON.stringify({ 'patient-id': patientId });
    
    if (!mockPatients.has(patientKey)) {
      return false;
    }
    
    return mockPatients.get(patientKey).active;
  }
};

// Tests
describe('Patient Identity Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockPatients.clear();
    mockBlockTime = 1625097600;
    mockTxSender = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
  });
  
  describe('register-patient', () => {
    it('should register a new patient successfully', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const metadataHash = new Uint8Array(32).fill(1);
      
      const result = patientIdentityContract['register-patient'](patientId, metadataHash);
      
      expect(result.type).toBe('ok');
      
      const patientData = patientIdentityContract['get-patient'](patientId);
      expect(patientData.type).toBe('some');
      expect(patientData.value.owner).toBe(mockTxSender);
      expect(patientData.value.active).toBe(true);
    });
    
    it('should fail when registering a patient that already exists', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const metadataHash = new Uint8Array(32).fill(1);
      
      // Register once
      patientIdentityContract['register-patient'](patientId, metadataHash);
      
      // Try to register again
      const result = patientIdentityContract['register-patient'](patientId, metadataHash);
      
      expect(result.type).toBe('err');
      expect(result.value).toBe(1001);
    });
  });
  
  describe('update-patient-metadata', () => {
    it('should update patient metadata successfully', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const initialMetadataHash = new Uint8Array(32).fill(1);
      const updatedMetadataHash = new Uint8Array(32).fill(2);
      
      // Register patient
      patientIdentityContract['register-patient'](patientId, initialMetadataHash);
      
      // Update time to simulate block progression
      mockBlockTime += 3600;
      
      // Update metadata
      const result = patientIdentityContract['update-patient-metadata'](patientId, updatedMetadataHash);
      
      expect(result.type).toBe('ok');
      
      const patientData = patientIdentityContract['get-patient'](patientId);
      expect(patientData.value['metadata-hash']).toEqual(updatedMetadataHash);
      expect(patientData.value['updated-at']).toBe(mockBlockTime);
    });
    
    it('should fail when updating a non-existent patient', () => {
      const patientId = 'non-existent-id';
      const metadataHash = new Uint8Array(32).fill(1);
      
      const result = patientIdentityContract['update-patient-metadata'](patientId, metadataHash);
      
      expect(result.type).toBe('err');
      expect(result.value).toBe(1002);
    });
    
    it('should fail when updating a patient by non-owner', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const metadataHash = new Uint8Array(32).fill(1);
      
      // Register patient
      patientIdentityContract['register-patient'](patientId, metadataHash);
      
      // Change tx-sender
      const originalSender = mockTxSender;
      mockTxSender = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
      
      // Try to update metadata
      const result = patientIdentityContract['update-patient-metadata'](patientId, metadataHash);
      
      expect(result.type).toBe('err');
      expect(result.value).toBe(1003);
      
      // Restore tx-sender
      mockTxSender = originalSender;
    });
  });
  
  describe('is-patient-active', () => {
    it('should return true for active patients', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const metadataHash = new Uint8Array(32).fill(1);
      
      patientIdentityContract['register-patient'](patientId, metadataHash);
      
      const isActive = patientIdentityContract['is-patient-active'](patientId);
      
      expect(isActive).toBe(true);
    });
    
    it('should return false for non-existent patients', () => {
      const patientId = 'non-existent-id';
      
      const isActive = patientIdentityContract['is-patient-active'](patientId);
      
      expect(isActive).toBe(false);
    });
  });
});
