;; Record Location Contract
;; Maps where patient data is stored across providers

(define-data-var admin principal tx-sender)

;; Data structures
(define-map record-locations
  {
    patient-id: (string-utf8 36),
    record-type: (string-utf8 50)
  }
  {
    provider-id: principal,
    location-uri: (string-utf8 255),
    metadata: (string-utf8 255),
    created-at: uint,
    updated-at: uint
  }
)

;; Public functions
(define-public (register-record-location
  (patient-id (string-utf8 36))
  (record-type (string-utf8 50))
  (location-uri (string-utf8 255))
  (metadata (string-utf8 255))
)
  (let
    ((caller tx-sender)
     (current-time (get-block-info? time (- block-height u1))))
    (asserts! (is-some current-time) (err u1000))

    ;; In a real implementation, we would check consent here
    ;; by calling the consent-management contract

    (ok (map-set record-locations
      {
        patient-id: patient-id,
        record-type: record-type
      }
      {
        provider-id: caller,
        location-uri: location-uri,
        metadata: metadata,
        created-at: (unwrap-panic current-time),
        updated-at: (unwrap-panic current-time)
      }
    ))
  )
)

(define-public (update-record-location
  (patient-id (string-utf8 36))
  (record-type (string-utf8 50))
  (location-uri (string-utf8 255))
  (metadata (string-utf8 255))
)
  (let
    ((record-data (unwrap! (map-get? record-locations {patient-id: patient-id, record-type: record-type}) (err u1002)))
     (current-time (get-block-info? time (- block-height u1))))
    (asserts! (is-some current-time) (err u1000))
    (asserts! (is-eq tx-sender (get provider-id record-data)) (err u1003))

    ;; In a real implementation, we would check consent here

    (ok (map-set record-locations
      {
        patient-id: patient-id,
        record-type: record-type
      }
      (merge record-data {
        location-uri: location-uri,
        metadata: metadata,
        updated-at: (unwrap-panic current-time)
      })
    ))
  )
)

(define-public (delete-record-location (patient-id (string-utf8 36)) (record-type (string-utf8 50)))
  (let
    ((record-data (unwrap! (map-get? record-locations {patient-id: patient-id, record-type: record-type}) (err u1002))))
    (asserts! (or (is-eq tx-sender (get provider-id record-data)) (is-eq tx-sender (var-get admin))) (err u1003))
    (ok (map-delete record-locations {patient-id: patient-id, record-type: record-type}))
  )
)

;; Read-only functions
(define-read-only (get-record-location (patient-id (string-utf8 36)) (record-type (string-utf8 50)))
  (map-get? record-locations {patient-id: patient-id, record-type: record-type})
)

;; Admin functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u1004))
    (ok (var-set admin new-admin))
  )
)
