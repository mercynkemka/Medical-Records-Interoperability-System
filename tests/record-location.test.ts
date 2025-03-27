import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockRecordLocations = new Map();
let mockBlockHeight = 100;
let mockBlockTime = 1625097600; // Example timestamp
let mockTxSender = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
let mockAdmin = mockTxSender;

// Mock contract functions
const recordLocationContract = {
  // Data variables
  admin: mockAdmin,
  
  // Maps
  'record-locations': mockRecordLocations,
  
  // Helper functions to simulate Clarity behavior
  'get-block-info?': (key, height) => {
    if (key === 'time') {
      return { type: 'some', value: mockBlockTime };
    }
    return { type: 'none' };
  },
  
  // Contract functions
  'register-record-location': (patientId, recordType, locationUri, metadata) => {
    const recordKey = JSON.stringify({ 'patient-id': patientId, 'record-type': recordType });
    
    mockRecordLocations.set(recordKey, {
      'provider-id': mockTxSender,
      'location-uri': locationUri,
      metadata,
      'created-at': mockBlockTime,
      'updated-at': mockBlockTime
    });
    
    return { type: 'ok', value: true };
  },
  
  'update-record-location': (patientId, recordType, locationUri, metadata) => {
    const recordKey = JSON.stringify({ 'patient-id': patientId, 'record-type': recordType });
    
    if (!mockRecordLocations.has(recordKey)) {
      return { type: 'err', value: 1002 };
    }
    
    const recordData = mockRecordLocations.get(recordKey);
    
    if (recordData['provider-id'] !== mockTxSender) {
      return { type: 'err', value: 1003 };
    }
    
    recordData['location-uri'] = locationUri;
    recordData.metadata = metadata;
    recordData['updated-at'] = mockBlockTime;
    mockRecordLocations.set(recordKey, recordData);
    
    return { type: 'ok', value: true };
  },
  
  'delete-record-location': (patientId, recordType) => {
    const recordKey = JSON.stringify({ 'patient-id': patientId, 'record-type': recordType });
    
    if (!mockRecordLocations.has(recordKey)) {
      return { type: 'err', value: 1002 };
    }
    
    const recordData = mockRecordLocations.get(recordKey);
    
    if (recordData['provider-id'] !== mockTxSender && mockTxSender !== mockAdmin) {
      return { type: 'err', value: 1003 };
    }
    
    mockRecordLocations.delete(recordKey);
    
    return { type: 'ok', value: true };
  },
  
  'get-record-location': (patientId, recordType) => {
    const recordKey = JSON.stringify({ 'patient-id': patientId, 'record-type': recordType });
    
    if (!mockRecordLocations.has(recordKey)) {
      return { type: 'none' };
    }
    
    return { type: 'some', value: mockRecordLocations.get(recordKey) };
  }
};

// Tests
describe('Record Location Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockRecordLocations.clear();
    mockBlockTime = 1625097600;
    mockTxSender = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
  });
  
  describe('register-record-location', () => {
    it('should register a record location successfully', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const recordType = 'lab-results';
      const locationUri = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
      const metadata = '{"format": "pdf", "size": "1.2MB"}';
      
      const result = recordLocationContract['register-record-location'](patientId, recordType, locationUri, metadata);
      
      expect(result.type).toBe('ok');
      
      const recordData = recordLocationContract['get-record-location'](patientId, recordType);
      expect(recordData.type).toBe('some');
      expect(recordData.value['provider-id']).toBe(mockTxSender);
      expect(recordData.value['location-uri']).toBe(locationUri);
      expect(recordData.value.metadata).toBe(metadata);
    });
  });
  
  describe('update-record-location', () => {
    it('should update a record location successfully', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const recordType = 'lab-results';
      const initialLocationUri = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
      const initialMetadata = '{"format": "pdf", "size": "1.2MB"}';
      const updatedLocationUri = 'ipfs://QmNewLocationHash';
      const updatedMetadata = '{"format": "pdf", "size": "1.5MB", "updated": true}';
      
      // Register record location
      recordLocationContract['register-record-location'](patientId, recordType, initialLocationUri, initialMetadata);
      
      // Update time to simulate block progression
      mockBlockTime += 3600;
      
      // Update record location
      const result = recordLocationContract['update-record-location'](patientId, recordType, updatedLocationUri, updatedMetadata);
      
      expect(result.type).toBe('ok');
      
      const recordData = recordLocationContract['get-record-location'](patientId, recordType);
      expect(recordData.value['location-uri']).toBe(updatedLocationUri);
      expect(recordData.value.metadata).toBe(updatedMetadata);
      expect(recordData.value['updated-at']).toBe(mockBlockTime);
    });
    
    it('should fail when updating a non-existent record location', () => {
      const patientId = 'non-existent-id';
      const recordType = 'lab-results';
      const locationUri = 'ipfs://QmNewLocationHash';
      const metadata = '{"format": "pdf"}';
      
      const result = recordLocationContract['update-record-location'](patientId, recordType, locationUri, metadata);
      
      expect(result.type).toBe('err');
      expect(result.value).toBe(1002);
    });
    
    it('should fail when updating a record location by non-provider', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const recordType = 'lab-results';
      const locationUri = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
      const metadata = '{"format": "pdf", "size": "1.2MB"}';
      
      // Register record location
      recordLocationContract['register-record-location'](patientId, recordType, locationUri, metadata);
      
      // Change tx-sender
      const originalSender = mockTxSender;
      mockTxSender = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
      
      // Try to update record location
      const result = recordLocationContract['update-record-location'](patientId, recordType, locationUri, metadata);
      
      expect(result.type).toBe('err');
      expect(result.value).toBe(1003);
      
      // Restore tx-sender
      mockTxSender = originalSender;
    });
  });
  
  describe('delete-record-location', () => {
    it('should delete a record location successfully', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const recordType = 'lab-results';
      const locationUri = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
      const metadata = '{"format": "pdf", "size": "1.2MB"}';
      
      // Register record location
      recordLocationContract['register-record-location'](patientId, recordType, locationUri, metadata);
      
      // Delete record location
      const result = recordLocationContract['delete-record-location'](patientId, recordType);
      
      expect(result.type).toBe('ok');
      
      const recordData = recordLocationContract['get-record-location'](patientId, recordType);
      expect(recordData.type).toBe('none');
    });
    
    it('should allow admin to delete a record location', () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const recordType = 'lab-results';
      const locationUri = 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
      const metadata = '{"format": "pdf", "size": "1.2MB"}';
      
      // Register record location
      recordLocationContract['register-record-location'](patientId, recordType, locationUri, metadata);
      
      // Change tx-sender to admin
      const originalSender = mockTxSender;
      mockTxSender = mockAdmin;
      
      // Delete record location as admin
      const result = recordLocationContract['delete-record-location'](patientId, recordType);
      
      expect(result.type).toBe('ok');
      
      // Restore tx-sender
      mockTxSender = originalSender;
    });
  });
});
