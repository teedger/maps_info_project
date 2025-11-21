package com.communitymaps.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.communitymaps.models.*
import com.communitymaps.services.RetrofitClient
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MapViewModel(application: Application) : AndroidViewModel(application) {

    private val apiService = RetrofitClient.apiService
    private val prefs = application.getSharedPreferences("auth", 0)

    private val _alerts = MutableStateFlow<List<Alert>>(emptyList())
    val alerts: StateFlow<List<Alert>> = _alerts.asStateFlow()

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _activeFilters = MutableStateFlow<Set<String>>(emptySet())
    val activeFilters: StateFlow<Set<String>> = _activeFilters.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _username = MutableStateFlow<String?>(null)
    val username: StateFlow<String?> = _username.asStateFlow()

    private val _nearbyCount = MutableStateFlow(0)
    val nearbyCount: StateFlow<Int> = _nearbyCount.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _mapCenter = MutableStateFlow(LatLng(40.7128, -74.006))
    val mapCenter: StateFlow<LatLng> = _mapCenter.asStateFlow()

    val filteredAlerts: List<Alert>
        get() = _alerts.value.filter { _activeFilters.value.contains(it.category) }

    private var token: String?
        get() = prefs.getString("token", null)
        set(value) = prefs.edit().putString("token", value).apply()

    init {
        checkAuth()
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val alertsResponse = apiService.getAlerts()
                val categoriesResponse = apiService.getCategories()

                if (alertsResponse.isSuccessful) {
                    _alerts.value = alertsResponse.body() ?: emptyList()
                }

                if (categoriesResponse.isSuccessful) {
                    val cats = categoriesResponse.body() ?: emptyList()
                    _categories.value = cats
                    _activeFilters.value = cats.map { it.id }.toSet()
                }
            } catch (e: Exception) {
                _errorMessage.value = "Failed to load data: ${e.message}"
            }
            _isLoading.value = false
        }
    }

    fun search(query: String) {
        viewModelScope.launch {
            try {
                val response = if (query.isEmpty()) {
                    apiService.getAlerts()
                } else {
                    apiService.getAlerts(search = query)
                }
                if (response.isSuccessful) {
                    _alerts.value = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = "Search failed: ${e.message}"
            }
        }
    }

    fun toggleFilter(categoryId: String) {
        val current = _activeFilters.value.toMutableSet()
        if (current.contains(categoryId)) {
            current.remove(categoryId)
        } else {
            current.add(categoryId)
        }
        _activeFilters.value = current
    }

    fun loadNearbyAlerts(lat: Double, lng: Double) {
        viewModelScope.launch {
            try {
                val response = apiService.getNearbyAlerts(lat, lng, 2.0)
                if (response.isSuccessful) {
                    _nearbyCount.value = response.body()?.size ?: 0
                }
            } catch (e: Exception) {
                // Silently fail for nearby alerts
            }
        }
    }

    fun createAlert(request: NewAlertRequest) {
        viewModelScope.launch {
            try {
                val authToken = token?.let { "Bearer $it" } ?: ""
                val response = apiService.createAlert(authToken, request)
                if (response.isSuccessful) {
                    response.body()?.let { newAlert ->
                        _alerts.value = listOf(newAlert) + _alerts.value
                    }
                }
            } catch (e: Exception) {
                _errorMessage.value = "Failed to create alert: ${e.message}"
            }
        }
    }

    fun upvoteAlert(id: String) {
        viewModelScope.launch {
            try {
                val response = apiService.upvoteAlert(id)
                if (response.isSuccessful) {
                    response.body()?.let { updated ->
                        _alerts.value = _alerts.value.map {
                            if (it.id == id) updated else it
                        }
                    }
                }
            } catch (e: Exception) {
                _errorMessage.value = "Failed to upvote: ${e.message}"
            }
        }
    }

    fun deleteAlert(id: String) {
        viewModelScope.launch {
            try {
                val authToken = token?.let { "Bearer $it" } ?: ""
                val response = apiService.deleteAlert(authToken, id)
                if (response.isSuccessful) {
                    _alerts.value = _alerts.value.filter { it.id != id }
                }
            } catch (e: Exception) {
                _errorMessage.value = "Failed to delete: ${e.message}"
            }
        }
    }

    fun login(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = apiService.login(LoginRequest(email, password))
                if (response.isSuccessful) {
                    response.body()?.let {
                        token = it.token
                        prefs.edit().putString("username", it.user.username).apply()
                        _isLoggedIn.value = true
                        _username.value = it.user.username
                        onSuccess()
                    }
                } else {
                    onError("Invalid credentials")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Login failed")
            }
        }
    }

    fun register(username: String, email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = apiService.register(RegisterRequest(username, email, password))
                if (response.isSuccessful) {
                    response.body()?.let {
                        token = it.token
                        prefs.edit().putString("username", it.user.username).apply()
                        _isLoggedIn.value = true
                        _username.value = it.user.username
                        onSuccess()
                    }
                } else {
                    onError("Registration failed")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Registration failed")
            }
        }
    }

    fun logout() {
        token = null
        prefs.edit().remove("username").apply()
        _isLoggedIn.value = false
        _username.value = null
    }

    private fun checkAuth() {
        if (token != null) {
            _isLoggedIn.value = true
            _username.value = prefs.getString("username", null)
        }
    }

    fun setMapCenter(latLng: LatLng) {
        _mapCenter.value = latLng
    }
}
