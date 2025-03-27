;; Access Audit Contract
;; Tracks who has viewed or modified health information

(define-data-var admin principal tx-sender)

;; Data structures
(define-map access-logs
  uint
  {
    patient-id: (string-utf8 36),
    provider-id: principal,
    record-type: (string-utf8 50),
    action: (string-ascii 6),
    timestamp: uint,
    details: (string-utf8 255)
  }
)

(define-data-var log-counter uint u0)

;; Constants for actions
(define-constant ACTION_VIEW "view")
(define-constant ACTION_CREATE "create")
(define-constant ACTION_UPDATE "update")
(define-constant ACTION_DELETE "delete")

;; Public functions
(define-public (log-access
  (patient-id (string-utf8 36))
  (record-type (string-utf8 50))
  (action (string-ascii 6))
  (details (string-utf8 255))
)
  (let
    ((caller tx-sender)
     (current-time (get-block-info? time (- block-height u1)))
     (log-id (var-get log-counter)))
    (asserts! (is-some current-time) (err u1000))
    (asserts! (or
      (is-eq action ACTION_VIEW)
      (is-eq action ACTION_CREATE)
      (is-eq action ACTION_UPDATE)
      (is-eq action ACTION_DELETE)
    ) (err u1005))

    ;; In a real implementation, we would check consent here

    (map-set access-logs
      log-id
      {
        patient-id: patient-id,
        provider-id: caller,
        record-type: record-type,
        action: action,
        timestamp: (unwrap-panic current-time),
        details: details
      }
    )
    (var-set log-counter (+ log-id u1))
    (ok log-id)
  )
)

;; Read-only functions
(define-read-only (get-access-log (log-id uint))
  (map-get? access-logs log-id)
)

(define-read-only (get-log-count)
  (var-get log-counter)
)

;; Admin functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u1004))
    (ok (var-set admin new-admin))
  )
)
