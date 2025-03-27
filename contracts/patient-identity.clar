;; Patient Identity Contract
;; Manages secure digital health identities

(define-data-var admin principal tx-sender)

;; Data structures
(define-map patients
  { patient-id: (string-utf8 36) }
  {
    owner: principal,
    metadata-hash: (buff 32),
    active: bool,
    created-at: uint,
    updated-at: uint
  }
)

;; Public functions
(define-public (register-patient (patient-id (string-utf8 36)) (metadata-hash (buff 32)))
  (let
    ((caller tx-sender)
     (current-time (get-block-info? time (- block-height u1))))
    (asserts! (is-some current-time) (err u1000))
    (asserts! (is-none (map-get? patients {patient-id: patient-id})) (err u1001))
    (ok (map-set patients
      {patient-id: patient-id}
      {
        owner: caller,
        metadata-hash: metadata-hash,
        active: true,
        created-at: (unwrap-panic current-time),
        updated-at: (unwrap-panic current-time)
      }
    ))
  )
)

(define-public (update-patient-metadata (patient-id (string-utf8 36)) (metadata-hash (buff 32)))
  (let
    ((patient-data (unwrap! (map-get? patients {patient-id: patient-id}) (err u1002)))
     (current-time (get-block-info? time (- block-height u1))))
    (asserts! (is-some current-time) (err u1000))
    (asserts! (is-eq tx-sender (get owner patient-data)) (err u1003))
    (ok (map-set patients
      {patient-id: patient-id}
      (merge patient-data {
        metadata-hash: metadata-hash,
        updated-at: (unwrap-panic current-time)
      })
    ))
  )
)

(define-public (deactivate-patient (patient-id (string-utf8 36)))
  (let
    ((patient-data (unwrap! (map-get? patients {patient-id: patient-id}) (err u1002)))
     (current-time (get-block-info? time (- block-height u1))))
    (asserts! (is-some current-time) (err u1000))
    (asserts! (or (is-eq tx-sender (get owner patient-data)) (is-eq tx-sender (var-get admin))) (err u1003))
    (ok (map-set patients
      {patient-id: patient-id}
      (merge patient-data {
        active: false,
        updated-at: (unwrap-panic current-time)
      })
    ))
  )
)

(define-public (reactivate-patient (patient-id (string-utf8 36)))
  (let
    ((patient-data (unwrap! (map-get? patients {patient-id: patient-id}) (err u1002)))
     (current-time (get-block-info? time (- block-height u1))))
    (asserts! (is-some current-time) (err u1000))
    (asserts! (or (is-eq tx-sender (get owner patient-data)) (is-eq tx-sender (var-get admin))) (err u1003))
    (ok (map-set patients
      {patient-id: patient-id}
      (merge patient-data {
        active: true,
        updated-at: (unwrap-panic current-time)
      })
    ))
  )
)

;; Read-only functions
(define-read-only (get-patient (patient-id (string-utf8 36)))
  (map-get? patients {patient-id: patient-id})
)

(define-read-only (is-patient-active (patient-id (string-utf8 36)))
  (match (map-get? patients {patient-id: patient-id})
    patient-data (get active patient-data)
    false
  )
)

;; Admin functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u1004))
    (ok (var-set admin new-admin))
  )
)
