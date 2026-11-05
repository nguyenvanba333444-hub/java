package com.example.restapi.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Transient;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    @Column(name = "room_id", nullable = false)
    private int roomId;        // phòng được thuê
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_booking_room"))
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private Room room;

    @Column(name = "tenant_id", nullable = false)
    private int tenantId;      // người thuê
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_booking_tenant"))
    @JsonIgnore
    private Tenant tenant;
    private String startDate;  // ngày bắt đầu thuê (yyyy-MM-dd)
    private String endDate;    // ngày kết thúc (yyyy-MM-dd)
    private String status;     // "PENDING" / "ACTIVE" / "DONE" / "CANCELLED"
    @Column(name = "deposit_amount", columnDefinition = "BIGINT NOT NULL DEFAULT 0")
    private long depositAmount;
    @Column(name = "payment_code", length = 40)
    private String paymentCode;
    @Column(name = "payment_status",
            columnDefinition = "ENUM('NOT_CONFIGURED','PENDING','PAID') NOT NULL DEFAULT 'NOT_CONFIGURED'")
    private String paymentStatus = "NOT_CONFIGURED";
    @Column(name = "payment_method",
            columnDefinition = "ENUM('BANK_TRANSFER','CASH') NOT NULL DEFAULT 'CASH'")
    private String paymentMethod = "CASH";
    @Transient
    private String paymentQrUrl;

    public Booking() {
    }

    public Booking(int id, int roomId, int tenantId, String startDate, String endDate, String status) {
        this.id = id;
        this.roomId = roomId;
        this.tenantId = tenantId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getRoomId() { return roomId; }
    public void setRoomId(int roomId) { this.roomId = roomId; }

    public int getTenantId() { return tenantId; }
    public void setTenantId(int tenantId) { this.tenantId = tenantId; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public long getDepositAmount() { return depositAmount; }
    public void setDepositAmount(long depositAmount) { this.depositAmount = depositAmount; }
    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentQrUrl() { return paymentQrUrl; }
    public void setPaymentQrUrl(String paymentQrUrl) { this.paymentQrUrl = paymentQrUrl; }
}
