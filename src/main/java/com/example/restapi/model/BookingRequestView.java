package com.example.restapi.model;

public class BookingRequestView {
    private final int id;
    private final int roomId;
    private final String roomTitle;
    private final String contactName;
    private final String contactPhone;
    private final String startDate;
    private final String endDate;
    private final String status;
    private final long depositAmount;
    private final String paymentMethod;
    private final String paymentStatus;
    private final String paymentCode;
    private final String paymentQrUrl;

    public BookingRequestView(int id, int roomId, String roomTitle, String contactName,
                              String contactPhone, String startDate, String endDate, String status,
                              long depositAmount, String paymentMethod, String paymentStatus,
                              String paymentCode, String paymentQrUrl) {
        this.id = id;
        this.roomId = roomId;
        this.roomTitle = roomTitle;
        this.contactName = contactName;
        this.contactPhone = contactPhone;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.depositAmount = depositAmount;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.paymentCode = paymentCode;
        this.paymentQrUrl = paymentQrUrl;
    }

    public int getId() { return id; }
    public int getRoomId() { return roomId; }
    public String getRoomTitle() { return roomTitle; }
    public String getContactName() { return contactName; }
    public String getContactPhone() { return contactPhone; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public String getStatus() { return status; }
    public long getDepositAmount() { return depositAmount; }
    public String getPaymentMethod() { return paymentMethod; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getPaymentCode() { return paymentCode; }
    public String getPaymentQrUrl() { return paymentQrUrl; }
}
