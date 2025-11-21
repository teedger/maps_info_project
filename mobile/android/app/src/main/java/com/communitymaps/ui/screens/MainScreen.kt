package com.communitymaps.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.communitymaps.models.Alert
import com.communitymaps.viewmodels.MapViewModel
import com.google.android.gms.maps.model.CameraPosition
import com.google.maps.android.compose.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: MapViewModel) {
    val alerts by viewModel.alerts.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val activeFilters by viewModel.activeFilters.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val username by viewModel.username.collectAsState()
    val mapCenter by viewModel.mapCenter.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    var showAddAlert by remember { mutableStateOf(false) }
    var showAuth by remember { mutableStateOf(false) }
    var showStats by remember { mutableStateOf(false) }
    var selectedAlert by remember { mutableStateOf<Alert?>(null) }
    var searchQuery by remember { mutableStateOf("") }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(mapCenter, 13f)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Community Maps") },
                actions = {
                    IconButton(onClick = { showStats = true }) {
                        Icon(Icons.Default.BarChart, "Stats")
                    }
                    if (isLoggedIn) {
                        IconButton(onClick = { viewModel.logout() }) {
                            Icon(Icons.Default.Logout, "Logout")
                        }
                    } else {
                        IconButton(onClick = { showAuth = true }) {
                            Icon(Icons.Default.Person, "Login")
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddAlert = true }
            ) {
                Icon(Icons.Default.Add, "Add Alert")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.search(it)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                placeholder = { Text("Search alerts...") },
                leadingIcon = { Icon(Icons.Default.Search, "Search") },
                singleLine = true
            )

            // Category Filters
            LazyRow(
                modifier = Modifier.padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { category ->
                    FilterChip(
                        selected = activeFilters.contains(category.id),
                        onClick = { viewModel.toggleFilter(category.id) },
                        label = { Text(category.name) }
                    )
                }
            }

            // Map
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = cameraPositionState
                ) {
                    viewModel.filteredAlerts.forEach { alert ->
                        Marker(
                            state = MarkerState(
                                position = com.google.android.gms.maps.model.LatLng(
                                    alert.latitude,
                                    alert.longitude
                                )
                            ),
                            title = alert.category,
                            snippet = alert.description,
                            onClick = {
                                selectedAlert = alert
                                true
                            }
                        )
                    }
                }

                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }

            // Alert List
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            ) {
                items(viewModel.filteredAlerts) { alert ->
                    AlertListItem(
                        alert = alert,
                        onClick = { selectedAlert = alert },
                        onUpvote = { viewModel.upvoteAlert(alert.id) }
                    )
                }
            }
        }
    }

    // Dialogs
    if (showAddAlert) {
        AddAlertDialog(
            viewModel = viewModel,
            onDismiss = { showAddAlert = false }
        )
    }

    if (showAuth) {
        AuthDialog(
            viewModel = viewModel,
            onDismiss = { showAuth = false }
        )
    }

    if (showStats) {
        StatsDialog(
            onDismiss = { showStats = false }
        )
    }

    selectedAlert?.let { alert ->
        AlertDetailDialog(
            alert = alert,
            canDelete = alert.userId != null && isLoggedIn,
            onDismiss = { selectedAlert = null },
            onUpvote = { viewModel.upvoteAlert(alert.id) },
            onDelete = {
                viewModel.deleteAlert(alert.id)
                selectedAlert = null
            }
        )
    }

    // Error Snackbar
    errorMessage?.let { message ->
        LaunchedEffect(message) {
            // Show snackbar
        }
    }
}

@Composable
fun AlertListItem(
    alert: Alert,
    onClick: () -> Unit,
    onUpvote: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = alert.category.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.titleSmall
                )
                alert.description?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                SeverityBadge(severity = alert.severity)
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(onClick = onUpvote) {
                    Row {
                        Icon(
                            Icons.Default.ThumbUp,
                            contentDescription = "Upvote",
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = " ${alert.upvotes}",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SeverityBadge(severity: String) {
    val color = when (severity.lowercase()) {
        "high" -> MaterialTheme.colorScheme.error
        "medium" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.primary
    }

    Surface(
        color = color.copy(alpha = 0.2f),
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = severity.replaceFirstChar { it.uppercase() },
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
