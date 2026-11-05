package com.example.restapi.controller;

import com.example.restapi.model.*;
import com.example.restapi.repository.TenantRepository;
import com.example.restapi.service.BookingService;
import com.example.restapi.service.RoomService;
import com.example.restapi.service.RoomImageStorageService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Controller
public class OwnerPortalController {
    private final TenantRepository tenants; private final RoomService rooms; private final BookingService bookings; private final RoomImageStorageService roomImages;
    public OwnerPortalController(TenantRepository tenants, RoomService rooms, BookingService bookings, RoomImageStorageService roomImages) { this.tenants=tenants; this.rooms=rooms; this.bookings=bookings; this.roomImages=roomImages; }

    @GetMapping("/room/new")
    public String newRoom(Model model, @AuthenticationPrincipal UserDetails principal) {
        Tenant account=account(principal); model.addAttribute("account",account); model.addAttribute("owners", tenants.findByRole(AccountRole.USER)); return "room/form";
    }

    @PostMapping("/room/new")
    public String saveRoom(@RequestParam String title,@RequestParam String address,@RequestParam String district,@RequestParam String city,
                           @RequestParam double price,@RequestParam double area,@RequestParam String description,
                           @RequestParam(required=false) java.util.List<MultipartFile> imageFiles,@RequestParam(required=false) Integer ownerId,
                           @AuthenticationPrincipal UserDetails principal, Model model) {
        java.util.List<String> imageUrls;
        try {
            imageUrls = roomImages.storeAll(imageFiles, 3);
        } catch (IllegalArgumentException exception) {
            model.addAttribute("error", exception.getMessage());
            model.addAttribute("account", account(principal));
            model.addAttribute("owners", tenants.findByRole(AccountRole.USER));
            model.addAttribute("selectedCity", city);
            model.addAttribute("selectedDistrict", district);
            return "room/form";
        }
        Tenant account=account(principal); int actualOwnerId="ADMIN".equals(account.getRole()) && ownerId!=null ? ownerId : account.getId();
        Room room=new Room(); room.setTitle(title);room.setAddress(address);room.setDistrict(district);room.setCity(city);room.setPrice(price);room.setArea(area);room.setDescription(description);room.setImageUrls(imageUrls);room.setOwnerId(actualOwnerId);room.setAvailable(true);
        rooms.addRoom(room); return "redirect:/manage?created=1";
    }

    @GetMapping("/manage")
    public String manage(Model model,@RequestParam(required=false) Integer ownerId,@AuthenticationPrincipal UserDetails principal) {
        Tenant account=account(principal); boolean admin="ADMIN".equals(account.getRole()); int selected=admin?(ownerId==null?0:ownerId):account.getId();
        model.addAttribute("owners",admin?tenants.findByRole(AccountRole.USER):java.util.List.of(account));
        model.addAttribute("selectedOwnerId",selected==0?null:selected);
        model.addAttribute("rooms",selected==0?java.util.List.of():rooms.getRoomsByOwner(selected));
        model.addAttribute("requests",selected==0?java.util.List.of():bookings.getRequestsByOwner(selected));
        return "room/manage";
    }

    @GetMapping("/room/{id}/edit")
    public String edit(@PathVariable int id,Model model,@AuthenticationPrincipal UserDetails principal) {
        Tenant account=account(principal); Room room=rooms.getRoomById(id); if(room==null) return "redirect:/manage?error=1";
        if(!"ADMIN".equals(account.getRole()) && room.getOwnerId()!=account.getId()) return "redirect:/access-denied";
        model.addAttribute("room",room);model.addAttribute("owners",tenants.findByRole(AccountRole.USER));model.addAttribute("account",account);return "room/edit";
    }

    @PostMapping("/room/{id}/edit")
    public String update(@PathVariable int id,@RequestParam String title,@RequestParam String address,@RequestParam String district,@RequestParam String city,
                        @RequestParam double price,@RequestParam double area,@RequestParam String description,@RequestParam(required=false) java.util.List<MultipartFile> imageFiles,
                        @RequestParam(defaultValue="true") boolean available,@RequestParam(required=false) Integer ownerId,
                        @AuthenticationPrincipal UserDetails principal, Model model) {
        Tenant account=account(principal);Room room=rooms.getRoomById(id);if(room==null||(!"ADMIN".equals(account.getRole())&&room.getOwnerId()!=account.getId()))return "redirect:/access-denied";
        java.util.List<String> oldImageUrls=new java.util.ArrayList<>(room.getImageUrls());
        java.util.List<String> uploadedImageUrls=null;
        try {
            boolean hasNewImages=imageFiles!=null&&imageFiles.stream().anyMatch(image->image!=null&&!image.isEmpty());
            if(hasNewImages) uploadedImageUrls=roomImages.storeAll(imageFiles,3);
            else if(oldImageUrls.size()<3) throw new IllegalArgumentException("Tin phòng cần có ít nhất 3 ảnh. Vui lòng chọn ảnh bổ sung.");
        } catch (IllegalArgumentException exception) {
            model.addAttribute("error", exception.getMessage());
            model.addAttribute("room", room);
            model.addAttribute("owners", tenants.findByRole(AccountRole.USER));
            model.addAttribute("account", account);
            model.addAttribute("selectedCity", city);
            model.addAttribute("selectedDistrict", district);
            return "room/edit";
        }
        room.setTitle(title);room.setAddress(address);room.setDistrict(district);room.setCity(city);room.setPrice(price);room.setArea(area);room.setDescription(description);if(uploadedImageUrls!=null)room.setImageUrls(uploadedImageUrls);room.setAvailable(available);if("ADMIN".equals(account.getRole())&&ownerId!=null)room.setOwnerId(ownerId);
        boolean updated=rooms.updateRoom(id,room);
        if(updated&&uploadedImageUrls!=null)roomImages.deleteAll(oldImageUrls);
        return "ADMIN".equals(account.getRole()) ? "redirect:/admin/rooms?updated=1" : "redirect:/manage?ownerId="+room.getOwnerId()+"&updated=1";
    }

    @PostMapping("/room/{id}/delete")
    public String delete(@PathVariable int id,@AuthenticationPrincipal UserDetails principal) {
        Tenant account=account(principal);Room room=rooms.getRoomById(id);if(room==null||(!"ADMIN".equals(account.getRole())&&room.getOwnerId()!=account.getId()))return "redirect:/access-denied";
        int ownerId=room.getOwnerId();boolean deleted=rooms.deleteRoom(id);if(deleted)roomImages.deleteAll(room.getImageUrls());
        return "ADMIN".equals(account.getRole()) ? "redirect:/admin/rooms?deleted=1" : "redirect:/manage?ownerId="+ownerId+"&deleted=1";
    }

    @PostMapping("/booking/{id}/status")
    public String status(@PathVariable int id,@RequestParam String status,@RequestParam(required=false) Integer ownerId,@AuthenticationPrincipal UserDetails principal) {
        Tenant account=account(principal);Booking booking=bookings.getBookingById(id);Room room=booking==null?null:rooms.getRoomById(booking.getRoomId());
        if(room==null||(!"ADMIN".equals(account.getRole())&&room.getOwnerId()!=account.getId()))return "redirect:/access-denied";
        int selected="ADMIN".equals(account.getRole())&&ownerId!=null?ownerId:account.getId();
        bookings.updateRequestStatus(id,status);return "redirect:/manage?ownerId="+selected+"&requestUpdated=1";
    }
    private Tenant account(UserDetails principal){return tenants.findByEmailIgnoreCase(principal.getUsername()).orElseThrow();}
}
