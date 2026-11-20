import java.util.Properties

plugins {
    id("com.android.application")
}

android {
    namespace = "ru.igorrais82.pvz"
    compileSdk = 35

    defaultConfig {
        applicationId = "ru.igorrais82.pvz"
        minSdk = 26
        targetSdk = 35
        versionCode = 20100
        versionName = "2.1.0"
    }

    val keystoreProps = rootProject.file("keystore.properties")
    signingConfigs {
        if (keystoreProps.exists()) {
            create("release") {
                val props = Properties()
                keystoreProps.inputStream().use { props.load(it) }
                storeFile = rootProject.file(props.getProperty("storeFile"))
                storePassword = props.getProperty("storePassword")
                keyAlias = props.getProperty("keyAlias")
                keyPassword = props.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            if (keystoreProps.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += setOf("META-INF/*", "META-INF/**")
    }
}
